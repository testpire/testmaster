#!/usr/bin/env python3
"""
One-time setup: create loadtest students st51–st1000, set permanent passwords,
assign test 37. Reuses existing students (st01–st50) already in place.

Usage:
    python3 setup_students.py
    python3 setup_students.py --start 51 --end 1000   # default
    python3 setup_students.py --start 200 --end 300   # resume a range
"""

import asyncio
import aiohttp
import argparse
import time
import sys
from dataclasses import dataclass, field
from typing import List, Optional

API_BASE     = "https://passport-ambien-update-beginner.trycloudflare.com/api"
ADMIN_USER   = "admin@learnx.com"
ADMIN_PASS   = "June#123"
STUDENT_PASS = "Test@1234"
INSTITUTE_ID = 9
TEST_ID      = 37

CONCURRENCY  = 40          # parallel in-flight requests per phase
TOKEN_TTL_S  = 3000        # re-login before token's 3600s lifetime ends

# ─── Auth ────────────────────────────────────────────────────────────────────

class AdminSession:
    def __init__(self, session: aiohttp.ClientSession):
        self._session = session
        self._token: Optional[str] = None
        self._token_ts: float = 0
        self._lock = asyncio.Lock()

    async def token(self) -> str:
        async with self._lock:
            if time.time() - self._token_ts > TOKEN_TTL_S:
                await self._refresh()
        return self._token

    async def _refresh(self):
        async with self._session.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USER, "password": ADMIN_PASS},
        ) as r:
            d = await r.json(content_type=None)
        t = d.get("accessToken")
        if not t:
            raise RuntimeError(f"Admin login failed: {d.get('message', d)}")
        self._token = t
        self._token_ts = time.time()
        print("  [auth] token refreshed", flush=True)

    async def hdrs(self):
        return {"Authorization": f"Bearer {await self.token()}"}


# ─── State tracking ──────────────────────────────────────────────────────────

@dataclass
class Counters:
    created:   int = 0
    skipped:   int = 0
    create_err: int = 0
    pw_ok:     int = 0
    pw_err:    int = 0
    assign_ok: int = 0
    assign_skip: int = 0
    assign_err: int = 0
    failed_ids: List[str] = field(default_factory=list)

C = Counters()
_print_lock = None


def log(msg: str):
    print(msg, flush=True)


# ─── Per-student pipeline ────────────────────────────────────────────────────

async def setup_one(
    session: aiohttp.ClientSession,
    admin: AdminSession,
    sem: asyncio.Semaphore,
    n: int,
):
    username = f"loadtest.st{n:02d}@learnx.com"
    email    = username

    async with sem:
        hdrs = await admin.hdrs()

        # ── 1. CREATE ────────────────────────────────────────────────────────
        async with session.post(
            f"{API_BASE}/students",
            json={
                "username":    username,
                "email":       email,
                "password":    STUDENT_PASS,
                "firstName":   "LoadTest",
                "lastName":    f"Student{n:02d}",
                "instituteId": INSTITUTE_ID,
                "enabled":     True,
            },
            headers=hdrs,
        ) as r:
            create_resp = await r.json(content_type=None)

        student_id: Optional[int] = (
            create_resp.get("id")
            or (create_resp.get("data") or {}).get("id")
        )
        msg = str(create_resp.get("message", "")).lower()

        if student_id:
            C.created += 1
        elif "exist" in msg or "already" in msg or "duplicate" in msg:
            C.skipped += 1
            # Try to fetch the existing student's ID so we can still set pw+assign
            # Search by email — use advanced search
            async with session.post(
                f"{API_BASE}/students/search/advanced",
                json={
                    "criteria": {},
                    "pagination": {"page": 0, "size": 100},
                    "sorting": {"field": "createdAt", "direction": "desc"},
                },
                headers=await admin.hdrs(),
            ) as r2:
                sr = await r2.json(content_type=None)
            students = sr.get("students", sr.get("data", {}).get("students", []) if isinstance(sr.get("data"), dict) else [])
            match = next((s for s in students if s.get("username") == username or s.get("email") == email), None)
            student_id = match.get("id") if match else None
        else:
            C.create_err += 1
            C.failed_ids.append(f"CREATE-{n}: {create_resp.get('message','?')[:60]}")
            return

        if not student_id:
            C.create_err += 1
            C.failed_ids.append(f"NO-ID-{n}")
            return

        # ── 2. SET PASSWORD (permanent) ──────────────────────────────────────
        async with session.post(
            f"{API_BASE}/users/{student_id}/set-password",
            json={"newPassword": STUDENT_PASS, "permanent": True},
            headers=await admin.hdrs(),
        ) as r:
            pw_resp = await r.json(content_type=None)

        if pw_resp.get("success"):
            C.pw_ok += 1
        else:
            C.pw_err += 1
            C.failed_ids.append(f"PW-{n}({student_id}): {pw_resp.get('message','?')[:60]}")

        # ── 3. ASSIGN TEST ───────────────────────────────────────────────────
        async with session.post(
            f"{API_BASE}/tests/{TEST_ID}/assignments",
            json={
                "targetType":    "STUDENT",
                "targetId":      student_id,
                "availableFrom": "2026-06-27T00:00:00Z",
                "availableUntil":"2026-12-31T23:59:59Z",
            },
            headers=await admin.hdrs(),
        ) as r:
            asgn_resp = await r.json(content_type=None)

        asgn_msg = str(asgn_resp.get("message", "")).lower()
        if asgn_resp.get("success"):
            C.assign_ok += 1
        elif "already" in asgn_msg or "exist" in asgn_msg or "duplicate" in asgn_msg:
            C.assign_skip += 1
        else:
            C.assign_err += 1
            C.failed_ids.append(f"ASSIGN-{n}({student_id}): {asgn_resp.get('message','?')[:60]}")

        # Progress dot every 10 students
        total_done = C.created + C.skipped
        if total_done % 10 == 0:
            log(
                f"  progress: created={C.created} skipped={C.skipped} "
                f"pw_ok={C.pw_ok} assign_ok={C.assign_ok} "
                f"errors(create/pw/assign)={C.create_err}/{C.pw_err}/{C.assign_err}"
            )


# ─── Main ────────────────────────────────────────────────────────────────────

async def main(start: int, end: int):
    global _print_lock
    _print_lock = asyncio.Lock()

    numbers = list(range(start, end + 1))

    border = "═" * 60
    print(f"\n{border}")
    print(f"  TestPire student setup")
    print(f"  Creating students st{start:02d}–st{end:02d} ({len(numbers)} total)")
    print(f"  Concurrency: {CONCURRENCY}")
    print(f"{border}\n")

    connector = aiohttp.TCPConnector(limit=150, ssl=False)
    timeout   = aiohttp.ClientTimeout(total=120, connect=30, sock_read=60)
    sem       = asyncio.Semaphore(CONCURRENCY)

    t0 = time.perf_counter()

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        admin = AdminSession(session)
        await admin._refresh()   # warm up token before spawning tasks

        tasks = [
            asyncio.create_task(setup_one(session, admin, sem, n))
            for n in numbers
        ]
        await asyncio.gather(*tasks, return_exceptions=True)

    elapsed = time.perf_counter() - t0

    print(f"\n{border}")
    print(f"  DONE in {elapsed:.1f}s")
    print(f"  Created:        {C.created}")
    print(f"  Already existed:{C.skipped}")
    print(f"  Create errors:  {C.create_err}")
    print(f"  PW set ok:      {C.pw_ok}   errors: {C.pw_err}")
    print(f"  Assigned ok:    {C.assign_ok}  skipped: {C.assign_skip}  errors: {C.assign_err}")
    if C.failed_ids:
        print(f"\n  Failures ({len(C.failed_ids)}):")
        for f in C.failed_ids[:30]:
            print(f"    • {f}")
    print(f"{border}\n")

    if C.create_err + C.pw_err + C.assign_err > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=51)
    parser.add_argument("--end",   type=int, default=1000)
    args = parser.parse_args()
    asyncio.run(main(args.start, args.end))
