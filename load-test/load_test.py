#!/usr/bin/env python3
"""
TestPire Load Test — realistic concurrent student test simulation
=================================================================

PURPOSE
-------
Measures how many students can simultaneously take a test on the TestPire
platform (testpire.github.io/testmaster) without errors or timeouts.

INSTALL
-------
    pip3 install aiohttp

QUICK START
-----------
    # Pure API throughput — no reading delays, fastest possible
    python3 load_test.py --students 200 --no-think

    # Realistic exam — students read/think before each answer
    python3 load_test.py --students 100 --think-min 10 --think-max 60

    # 1000 students — must stagger so ≤200 are active at once (backend limit)
    python3 load_test.py --students 1000 --no-think --stagger 150

KNOWN CAPACITY LIMITS (measured 2026-06-27)
--------------------------------------------
    ≤200 simultaneous → 100% success rate
    300 simultaneous  → ~67% success (backend saturates)
    500+              → ~40% success (heavy backend rejections)

    Root causes:
      - Spring Boot / Tomcat default thread pool: ~200 concurrent DB requests
      - AWS Cognito auth: ~25 concurrent logins before rate-limiting

TWO-PHASE DESIGN
----------------
    Phase 1 (Login):
        All students log in with LIMITED concurrency (default 25) to avoid
        hitting Cognito's rate limit. JWT tokens are cached in memory.
        This phase is NOT part of the API load measurement.

    Phase 2 (Test):
        All students take the test using cached tokens. This is the actual
        load against TestPire's own backend. Use --stagger to spread starts
        over N seconds so you don't exceed the ~200 concurrent limit.

STUDENT ACCOUNTS
----------------
    1000 accounts: loadtest.st01@learnx.com … loadtest.st1000@learnx.com
    5 extras     : lnx.student1@learnx.com  … lnx.student5@learnx.com
    Password      : Test@1234  (same for all)
    Institute     : LearnX (admin: admin@learnx.com / June#123)

    To recreate/extend accounts use setup_students.py in this directory.

TEST BEING USED
---------------
    Test ID 37 — "PhyDpp2"
    Type: PRACTICE (unlimited attempts per student — safe to rerun)
    Questions: 5 MCQ questions
    Valid until: 2026-08-30

    To use a different test:
      1. Change TEST_ID below
      2. Assign the new test to all students via the admin UI or
         setup_students.py (set TEST_ID there too and rerun)

API ENDPOINTS EXERCISED
-----------------------
    POST /auth/login                              → get JWT token
    GET  /student/tests/available                 → verify test is visible
    POST /student/tests/{testId}/attempts         → start (or resume) attempt
    PUT  /student/tests/attempts/{id}/answers     → save one answer
    POST /student/tests/attempts/{id}/submit      → submit for grading

SIMULATED STUDENT BEHAVIOUR
----------------------------
    1. Login with credentials
    2. Check available tests (confirms the test is assigned)
    3. Start a new attempt (or resume an in-progress one automatically)
    4. For each question in order:
         a. Wait think-time (--think-min to --think-max seconds)
         b. Pick a random answer option and save it
         c. With 25% probability: go back 1–3 questions and change that answer
            (simulates students reviewing earlier answers)
    5. Submit the attempt with the final answer set

READING THE OUTPUT
------------------
    Login      — time for POST /auth/login (Cognito, not your backend)
    Start      — time for POST /student/tests/{id}/attempts
    Save answer — time for each PUT /answers call (includes back-navigation)
    Submit     — time for POST /submit
    Total/student — wall-clock from login to submission for each student

    p95 is the key metric: 95% of students finished within that time.
    If p95 >> avg, a small fraction of students had very long waits (queuing).
"""

import asyncio
import aiohttp
import random
import time
import statistics
import argparse
import sys
from dataclasses import dataclass, field
from typing import List, Dict

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
#  Edit these defaults here, or override most of them with CLI flags at runtime.
# ═══════════════════════════════════════════════════════════════════════════════

# TestPire REST API base URL.
# If the Cloudflare tunnel URL below has expired, find the new one in .env:
#   grep VITE_API_BASE_URL /Users/araj/IdeaProjects/testmaster/.env
API_BASE = "https://passport-ambien-update-beginner.trycloudflare.com/api"

# ID of the test to load-test against.
# Must be PRACTICE type (unlimited attempts) so the script can be rerun freely.
# Test 37 = PhyDpp2: 5 questions, valid until 2026-08-30, assigned to all 1000 students.
TEST_ID = 37

# Password shared by every load-test student account.
STUDENT_PASSWORD = "Test@1234"

# Complete list of load-test student usernames (1005 accounts total).
# loadtest.st01 … loadtest.st1000 were created by setup_students.py.
# lnx.student1 … lnx.student5 are older manually-created accounts.
ALL_STUDENTS = (
    [f"loadtest.st{n:02d}@learnx.com" for n in range(1, 1001)] +
    [f"lnx.student{n}@learnx.com" for n in range(1, 6)]
)

# ── Phase 1 — Login concurrency ───────────────────────────────────────────────
# AWS Cognito starts rate-limiting (HTTP 429) above ~30 concurrent auth calls.
# Keep this at 25 or below to ensure all logins succeed even for 1000 students.
LOGIN_CONCURRENCY: int = 25

# ── Phase 2 — Test-taking concurrency ────────────────────────────────────────
# The TestPire backend (Spring Boot / Tomcat) saturates at ~200 simultaneous
# in-flight DB requests. Above that it returns 5xx errors.
# Default 9999 = effectively unlimited; use --stagger instead of lowering this
# to keep concurrency below the ceiling while all students still participate.
TEST_CONCURRENCY: int = 9999

# ── Think-time simulation (realistic mode, skipped with --no-think) ───────────
# Each student waits a random duration in this range before answering each
# question, simulating the time a real student takes to read and decide.
MIN_THINK_S: float = 10   # seconds — fast student
MAX_THINK_S: float = 60   # seconds — slow student

# ── Backward navigation simulation ───────────────────────────────────────────
# Real students frequently go back to review and change earlier answers.
# After answering question N, there is a BACKWARD_NAV_PROB chance the script
# will also re-answer one of the previous MAX_BACKWARD_JUMP questions.
BACKWARD_NAV_PROB: float = 0.25   # 25% chance per question
MAX_BACKWARD_JUMP: int   = 3      # jump at most 3 questions back

# ── Test-phase start staggering ───────────────────────────────────────────────
# When --stagger N is set, student starts are spread evenly over N seconds.
# Formula: student[i] starts at (N / total_students) * i seconds after t=0.
# Rule of thumb: stagger ≥ (avg_test_duration_s / 200) * total_students
#   e.g. for 1000 students averaging 25s each: 25/200 * 1000 = 125s → use 150s
STAGGER_SECONDS: float = 0   # 0 = all students start simultaneously

# ── HTTP timeouts ─────────────────────────────────────────────────────────────
# Cognito can take up to ~30s under heavy auth load; give it extra headroom.
LOGIN_TIMEOUT_S:  int = 90
# Individual TestPire API calls (start/answer/submit) should be fast (<5s
# normally). 30s is generous — if this is being hit, the backend is overloaded.
ANSWER_TIMEOUT_S: int = 30

# ═══════════════════════════════════════════════════════════════════════════════
#  METRICS COLLECTION
#  All timing lists are appended from concurrent coroutines; _lock guards them.
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Metrics:
    login_ms:   List[float] = field(default_factory=list)  # per-student login RTT
    start_ms:   List[float] = field(default_factory=list)  # start/resume attempt RTT
    answer_ms:  List[float] = field(default_factory=list)  # every save-answer RTT
    submit_ms:  List[float] = field(default_factory=list)  # final submit RTT
    total_ms:   List[float] = field(default_factory=list)  # wall-clock per student
    errors:     List[str]   = field(default_factory=list)  # human-readable failures
    login_fail: int = 0   # students who couldn't log in (Phase 1 failures)
    successes:  int = 0   # students who completed the full flow
    failures:   int = 0   # students who failed somewhere in Phase 2

_metrics = Metrics()
_lock: asyncio.Lock   # initialised in main() after the event loop starts


# ═══════════════════════════════════════════════════════════════════════════════
#  HTTP HELPERS
#  Thin wrappers that time every request and convert non-JSON / 5xx responses
#  into clear RuntimeError exceptions rather than silent None returns.
# ═══════════════════════════════════════════════════════════════════════════════

async def _request(session, method: str, url: str, timeout_s: int, **kwargs):
    """
    Execute one HTTP request and return (parsed_json_body, elapsed_ms).

    Raises RuntimeError on:
      - HTTP 5xx  → server error (backend overloaded / crashed)
      - Non-JSON body → usually an HTML error page from Cloudflare/proxy
      - Empty / None body → connection dropped before response was sent
    """
    t0 = time.perf_counter()
    to = aiohttp.ClientTimeout(total=timeout_s)
    async with getattr(session, method)(url, timeout=to, **kwargs) as r:
        if r.status >= 500:
            text = await r.text()
            raise RuntimeError(f"HTTP {r.status} from {url.split('/')[-1]}: {text[:80]}")
        try:
            body = await r.json(content_type=None)  # accept any Content-Type
        except Exception:
            text = await r.text()
            raise RuntimeError(f"Non-JSON {r.status} from {url.split('/')[-1]}: {text[:80]}")
        if body is None:
            raise RuntimeError(f"Empty response from {url.split('/')[-1]} (HTTP {r.status})")
    return body, (time.perf_counter() - t0) * 1000


async def _post(session, url, timeout_s=ANSWER_TIMEOUT_S, **kwargs):
    return await _request(session, "post", url, timeout_s, **kwargs)

async def _get(session, url, timeout_s=ANSWER_TIMEOUT_S, **kwargs):
    return await _request(session, "get", url, timeout_s, **kwargs)

async def _put(session, url, timeout_s=ANSWER_TIMEOUT_S, **kwargs):
    return await _request(session, "put", url, timeout_s, **kwargs)


# ═══════════════════════════════════════════════════════════════════════════════
#  PHASE 1 — LOGIN
#  All students log in concurrently up to LOGIN_CONCURRENCY at a time.
#  Successful tokens are stored in the `tokens` dict for Phase 2 to use.
# ═══════════════════════════════════════════════════════════════════════════════

async def login_student(
    session,
    username: str,
    idx: int,
    sem: asyncio.Semaphore,
    tokens: Dict[str, str],   # shared dict: username → JWT token
):
    """
    Log one student in and store their JWT token.

    The semaphore limits how many logins are in-flight simultaneously so
    we don't hit Cognito's rate limit (~30 concurrent = safe, >40 = drops).
    """
    async with sem:
        try:
            resp, ms = await _post(
                session,
                f"{API_BASE}/auth/login",
                timeout_s=LOGIN_TIMEOUT_S,
                json={"username": username, "password": STUDENT_PASSWORD},
            )
            token = resp.get("accessToken")
            if not token:
                raise RuntimeError(resp.get("message", "no token returned"))

            # Store the token; Phase 2 will read this dict after Phase 1 completes
            tokens[username] = token

            async with _lock:
                _metrics.login_ms.append(ms)

            # Progress log: print every 100th login and the first 5
            if idx % 100 == 0 or idx <= 5:
                print(f"  [login] {idx}/{len(tokens) + _metrics.login_fail} logged in  ({ms:.0f}ms)", flush=True)

        except Exception as e:
            async with _lock:
                _metrics.login_fail += 1
                _metrics.errors.append(f"LOGIN {username}: {e}")
            print(f"  [login FAIL] {username}: {e}", flush=True)


# ═══════════════════════════════════════════════════════════════════════════════
#  PHASE 2 — TEST SIMULATION
#  Each coroutine drives one student through the complete test-taking flow.
# ═══════════════════════════════════════════════════════════════════════════════

async def simulate_student(
    session,
    username: str,
    idx: int,
    token: str,
    sem: asyncio.Semaphore,
    no_think: bool,
):
    """
    Simulate one student taking the full test:
        login already done → check available → start attempt →
        answer each question (with optional think-time + back-navigation) →
        submit attempt → record metrics.

    The semaphore limits how many students are mid-test simultaneously,
    which is the primary knob for controlling backend load.
    """
    t_wall = time.perf_counter()
    hdrs = {"Authorization": f"Bearer {token}"}

    def log(msg: str):
        # Short prefix: [0042] loadtest.st42: <message>
        print(f"  [{idx:04d}] {username.split('@')[0]}: {msg}", flush=True)

    async with sem:
        try:
            # ── STEP 1: VERIFY TEST IS VISIBLE ────────────────────────────────
            # GET /student/tests/available returns all tests this student is
            # assigned to. We confirm TEST_ID is in the list before proceeding.
            # If it's missing, the admin needs to (re)assign the test to this student.
            avail_resp, _ = await _get(
                session, f"{API_BASE}/student/tests/available", headers=hdrs
            )
            tests = avail_resp.get("data", [])
            target = next((t for t in tests if t.get("testId") == TEST_ID), None)
            if not target:
                raise RuntimeError(
                    f"Test {TEST_ID} not visible "
                    f"(available test IDs: {[t.get('testId') for t in tests]})"
                )

            # ── STEP 2: START OR RESUME ATTEMPT ───────────────────────────────
            # POST /student/tests/{testId}/attempts
            # The backend is smart: if the student already has an in-progress
            # attempt it returns that (with saved answers), otherwise creates a
            # fresh one. Either way we get back the attempt_id and question list.
            start_resp, start_ms = await _post(
                session,
                f"{API_BASE}/student/tests/{TEST_ID}/attempts",
                json={},
                headers=hdrs,
            )
            if not start_resp.get("success"):
                raise RuntimeError(f"start attempt: {start_resp.get('message', '?')}")

            async with _lock:
                _metrics.start_ms.append(start_ms)

            attempt = start_resp.get("data", start_resp)
            attempt_id = attempt.get("id") or attempt.get("attemptId")
            questions  = attempt.get("questions", [])

            if not attempt_id or not questions:
                raise RuntimeError(
                    f"Unexpected attempt response: id={attempt_id}, questions={len(questions)}"
                )

            is_resume = "resumed" if target.get("inProgressAttemptId") else "new"
            log(f"{is_resume} attempt {attempt_id}, {len(questions)} questions  ({start_ms:.0f}ms)")

            # ── STEP 3: ANSWER ALL QUESTIONS ──────────────────────────────────
            # Build lookup structures from the question list returned by the server.
            # questions[i] shape: { questionId, text, options: [{id, text}, …], … }
            qids    = [q["questionId"] for q in questions]
            # Maps questionId → list of valid option IDs
            opt_map = {q["questionId"]: [o["id"] for o in q["options"]] for q in questions}
            # Tracks the last answer saved per question (for the final submit payload)
            saved   = {}

            async def save_answer(qid: int) -> float:
                """
                Pick a random option for qid and PUT it to the backend.
                In a real test the student would pick a specific answer; here
                we pick randomly because we're testing load, not correctness.
                Returns elapsed milliseconds.
                """
                chosen = random.choice(opt_map[qid])
                resp, ms = await _put(
                    session,
                    f"{API_BASE}/student/tests/attempts/{attempt_id}/answers",
                    json={"questionId": qid, "selectedOptionIds": [chosen]},
                    headers=hdrs,
                )
                async with _lock:
                    _metrics.answer_ms.append(ms)
                saved[qid] = chosen   # track latest answer for final submit
                if not resp.get("success"):
                    raise RuntimeError(f"save answer q{qid}: {resp.get('message', '?')}")
                return ms

            # Walk through questions sequentially (simulating forward navigation)
            cur = 0
            while cur < len(qids):
                # Think-time: simulate student reading the question
                if not no_think:
                    await asyncio.sleep(random.uniform(MIN_THINK_S, MAX_THINK_S))

                # Answer the current question
                await save_answer(qids[cur])

                # Backward navigation: with some probability, go back to an earlier
                # question and change the answer (very common in real exams).
                if cur > 0 and random.random() < BACKWARD_NAV_PROB:
                    back     = random.randint(1, min(MAX_BACKWARD_JUMP, cur))
                    back_qid = qids[cur - back]
                    if not no_think:
                        await asyncio.sleep(random.uniform(2, 8))  # brief review pause
                    await save_answer(back_qid)

                cur += 1

            # ── STEP 4: SUBMIT ATTEMPT ────────────────────────────────────────
            # POST /student/tests/attempts/{id}/submit
            # We send the full answer set as a backup even though answers were
            # already saved individually; this is what the real frontend does.
            # Fallback: if a question was somehow not answered, pick the first option.
            final_answers = [
                {
                    "questionId":        qid,
                    "selectedOptionIds": [saved.get(qid) or opt_map[qid][0]],
                }
                for qid in qids
            ]
            sub_resp, sub_ms = await _post(
                session,
                f"{API_BASE}/student/tests/attempts/{attempt_id}/submit",
                json={"answers": final_answers},
                headers=hdrs,
            )
            if not sub_resp.get("success"):
                raise RuntimeError(f"submit: {sub_resp.get('message', '?')}")

            async with _lock:
                _metrics.submit_ms.append(sub_ms)

            total_ms = (time.perf_counter() - t_wall) * 1000
            async with _lock:
                _metrics.total_ms.append(total_ms)
                _metrics.successes += 1

            log(f"DONE ✓  total={total_ms/1000:.1f}s  submit={sub_ms:.0f}ms")

        except Exception as exc:
            total_ms = (time.perf_counter() - t_wall) * 1000
            async with _lock:
                _metrics.failures += 1
                _metrics.errors.append(f"TEST {username}: {exc}")
            log(f"FAILED — {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
#  STATISTICS HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _pct(data: List[float], p: float) -> float:
    """Return the p-th percentile of data (e.g. p=95 → p95)."""
    if not data:
        return 0.0
    s = sorted(data)
    return s[max(0, min(int(len(s) * p / 100), len(s) - 1))]


def _stats(label: str, data: List[float]):
    """Print a one-line stats summary: n, min, avg, p95, max."""
    if not data:
        print(f"  {label:<24} no data")
        return
    print(
        f"  {label:<24} n={len(data):<5} "
        f"min={min(data):.0f}ms  avg={statistics.mean(data):.0f}ms  "
        f"p95={_pct(data, 95):.0f}ms  max={max(data):.0f}ms"
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

async def main(args):
    global MIN_THINK_S, MAX_THINK_S, _lock

    # Apply think-time flags
    if args.no_think:
        MIN_THINK_S = MAX_THINK_S = 0.0
    else:
        MIN_THINK_S = args.think_min
        MAX_THINK_S = args.think_max

    # asyncio.Lock must be created inside the running event loop
    _lock = asyncio.Lock()

    students   = ALL_STUDENTS[: min(args.students, len(ALL_STUDENTS))]
    login_conc = min(args.login_concurrency, len(students))
    test_conc  = min(args.test_concurrency, len(students))

    border = "═" * 68
    print(f"\n{border}")
    print(f"  TestPire Load Test — testpire.github.io/testmaster")
    print(f"  API      : {API_BASE}")
    print(f"  Test     : ID={TEST_ID} (PhyDpp2, PRACTICE, unlimited attempts)")
    print(f"  Students : {len(students)}  |  login-concurrency: {login_conc}  |  test-concurrency: {min(test_conc, len(students))}")
    print(f"  Think    : ", end="")
    if MIN_THINK_S == 0:
        print("none (--no-think)")
    else:
        print(f"{MIN_THINK_S}–{MAX_THINK_S}s/question  |  backward-nav prob: {BACKWARD_NAV_PROB*100:.0f}%")
    print(f"  Stagger  : {args.stagger}s between first and last test start")
    print(f"{border}\n")

    # Single shared TCP connector and session for both phases.
    # Using one session avoids "Session is closed" errors when the connector
    # is shared across two separate `async with ClientSession(...)` blocks.
    connector      = aiohttp.TCPConnector(limit=500, ssl=False)
    session_timeout = aiohttp.ClientTimeout(total=600)  # outer cap; per-request timeouts set at call site

    tokens: Dict[str, str] = {}  # username → JWT, populated by Phase 1

    async with aiohttp.ClientSession(connector=connector, timeout=session_timeout) as session:

        # ── PHASE 1: LOGIN ────────────────────────────────────────────────────
        # Pre-fetch all tokens before the load test starts. Limited to
        # LOGIN_CONCURRENCY (default 25) to stay under Cognito's rate limit.
        print(f"Phase 1 — logging in {len(students)} students (concurrency={login_conc})…")
        login_sem   = asyncio.Semaphore(login_conc)
        phase1_start = time.perf_counter()

        login_tasks = [
            asyncio.create_task(login_student(session, u, i + 1, login_sem, tokens))
            for i, u in enumerate(students)
        ]
        await asyncio.gather(*login_tasks, return_exceptions=True)

        phase1_s  = time.perf_counter() - phase1_start
        logged_in = len(tokens)
        print(f"\nPhase 1 done in {phase1_s:.1f}s — {logged_in} logged in, {_metrics.login_fail} failed\n")

        if not tokens:
            print("ERROR: no students logged in — aborting.")
            sys.exit(1)

        # ── PHASE 2: TEST TAKING ──────────────────────────────────────────────
        # Only students with a valid token participate. If some logins failed in
        # Phase 1 they are simply absent from `tokens` and skipped here.
        active  = list(tokens.items())   # [(username, token), …]
        stagger = args.stagger

        print(
            f"Phase 2 — {len(active)} students taking test "
            f"(concurrency={min(test_conc, len(active))}, stagger={stagger}s)…\n"
        )
        test_sem    = asyncio.Semaphore(test_conc)
        phase2_start = time.perf_counter()

        async def spawn(username: str, token: str, idx: int):
            # Stagger: delay start proportionally so students are spread over
            # `stagger` seconds. Student 0 starts immediately; the last student
            # starts at exactly `stagger` seconds after student 0.
            if stagger > 0 and idx > 0:
                delay = (stagger / max(len(active) - 1, 1)) * idx
                await asyncio.sleep(delay)
            await simulate_student(session, username, idx + 1, token, test_sem, args.no_think)

        test_tasks = [
            asyncio.create_task(spawn(u, t, i))
            for i, (u, t) in enumerate(active)
        ]
        await asyncio.gather(*test_tasks, return_exceptions=True)

    phase2_s   = time.perf_counter() - phase2_start
    total_wall = phase1_s + phase2_s

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    print(f"\n{border}")
    print(f"  RESULTS")
    print(f"  Phase 1 (login)  : {phase1_s:.1f}s  ({logged_in} ok, {_metrics.login_fail} failed)")
    print(f"  Phase 2 (test)   : {phase2_s:.1f}s  ({_metrics.successes} ok, {_metrics.failures} failed)")
    print(f"  Total wall time  : {total_wall:.1f}s")
    print()
    _stats("Login",             _metrics.login_ms)
    _stats("Start attempt",     _metrics.start_ms)
    _stats("Save answer (all)", _metrics.answer_ms)
    _stats("Submit",            _metrics.submit_ms)
    _stats("Total / student",   _metrics.total_ms)

    if _metrics.errors:
        print(f"\n  Errors ({len(_metrics.errors)}):")
        for e in _metrics.errors[:20]:
            print(f"    • {e}")
        if len(_metrics.errors) > 20:
            print(f"    … and {len(_metrics.errors) - 20} more")

    print(f"{border}\n")

    # Non-zero exit so CI/scripts can detect failures
    if _metrics.login_fail + _metrics.failures > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="TestPire concurrent load test",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--students", type=int, default=10,
        help="Number of students to simulate (default: 10, max: 1005)"
    )
    parser.add_argument(
        "--stagger", type=float, default=STAGGER_SECONDS,
        help=(
            f"Spread test starts over N seconds (0=simultaneous, default: {STAGGER_SECONDS}). "
            "Use --stagger 150 when running 1000 students to keep peak load ≤200 concurrent."
        )
    )
    parser.add_argument(
        "--login-concurrency", type=int, default=LOGIN_CONCURRENCY, dest="login_concurrency",
        help=f"Max parallel Cognito login requests (default: {LOGIN_CONCURRENCY}, hard ceiling ~30)"
    )
    parser.add_argument(
        "--test-concurrency", type=int, default=TEST_CONCURRENCY, dest="test_concurrency",
        help="Max students simultaneously in the test phase (default: all). Use --stagger instead."
    )
    parser.add_argument(
        "--think-min", type=float, default=MIN_THINK_S, dest="think_min",
        help=f"Minimum think-time per question in seconds (default: {MIN_THINK_S})"
    )
    parser.add_argument(
        "--think-max", type=float, default=MAX_THINK_S, dest="think_max",
        help=f"Maximum think-time per question in seconds (default: {MAX_THINK_S})"
    )
    parser.add_argument(
        "--no-think", action="store_true",
        help="Skip all think-time delays — pure API throughput test with no simulated reading time"
    )

    asyncio.run(main(parser.parse_args()))
