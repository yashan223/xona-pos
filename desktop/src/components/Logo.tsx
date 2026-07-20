interface LogoProps {
  collapsed?: boolean;
  className?: string;
}
export default function Logo({ collapsed = false, className = 'h-10 w-auto' }: LogoProps) {
  if (collapsed) {
    return (
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          d="M 20 20 L 60 60"
          stroke="var(--color-primary, #6366f1)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 60 20 L 20 60"
          stroke="var(--color-warning, #f5a623)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="40" cy="40" r="6" fill="#ffffff" stroke="var(--color-primary, #6366f1)" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 260 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 20 15 L 50 65"
        stroke="var(--color-primary, #6366f1)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 50 15 L 20 65"
        stroke="var(--color-warning, #f5a623)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="35" cy="40" r="5" fill="#ffffff" stroke="var(--color-primary, #6366f1)" strokeWidth="2" />
      <text
        x="68"
        y="52"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="currentColor"
        letterSpacing="0.05em"
      >
        XONA
      </text>
      <text
        x="180"
        y="52"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="34"
        fontStyle="italic"
        fill="var(--color-warning, #f5a623)"
        letterSpacing="-0.02em"
      >
        POS
      </text>
      <line
        x1="68"
        y1="60"
        x2="245"
        y2="60"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.15"
      />
    </svg>
  );
}
