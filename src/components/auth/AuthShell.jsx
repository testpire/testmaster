import React from 'react';
import Icon from '../AppIcon';
import { TestPireLogo } from '../ui/TestMasterLogo';

// Shared Scholar auth scaffold: an editorial evergreen brand panel on the left
// (desktop only) and a centred form column on the right. Used by login, signup,
// forgot-password and set-password so the whole entry flow feels of a piece.
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen flex bg-background">
    {/* Brand panel */}
    <div className="hidden lg:flex lg:w-[44%] xl:w-1/2 relative overflow-hidden bg-primary text-primary-foreground">
      {/* Soft atmospheric glows */}
      <div className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/25 blur-3xl" />
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 flex items-center justify-center">
            <Icon name="GraduationCap" size={22} className="text-primary-foreground" />
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight">LearnX</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold leading-[1.1] tracking-tight">
            Learning,
            <br />
            beautifully organised.
          </h1>
          <p className="mt-5 text-primary-foreground/80 leading-relaxed">
            One calm place for your courses, tests and progress — built for students,
            teachers and institutes alike.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-foreground/75">
          <span className="inline-flex items-center gap-2"><Icon name="ClipboardList" size={15} /> Tests</span>
          <span className="inline-flex items-center gap-2"><Icon name="FileText" size={15} /> Question bank</span>
          <span className="inline-flex items-center gap-2"><Icon name="BookOpen" size={15} /> Curriculum</span>
        </div>
      </div>
    </div>

    {/* Form column */}
    <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md animate-reveal">
        <div className="lg:hidden mb-8 flex justify-center">
          <TestPireLogo size="medium" />
        </div>

        <div className="mb-8">
          <h2 className="font-display text-3xl font-semibold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  </div>
);

export default AuthShell;
