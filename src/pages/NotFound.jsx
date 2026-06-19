import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'components/ui/Button';
import Icon from 'components/AppIcon';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md animate-reveal">
        <div className="relative flex justify-center mb-2">
          <h1 className="font-display text-[8rem] sm:text-[10rem] font-semibold text-primary/15 leading-none select-none">404</h1>
          <span className="absolute top-1/2 -translate-y-1/2 w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
            <Icon name="Compass" size={30} className="text-accent" />
          </span>
        </div>

        <h2 className="font-display text-2xl font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            iconName="ArrowLeft"
            iconPosition="left"
            onClick={() => window.history?.back()}
          >
            Go back
          </Button>
          <Button
            iconName="Home"
            iconPosition="left"
            onClick={() => navigate('/')}
          >
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
