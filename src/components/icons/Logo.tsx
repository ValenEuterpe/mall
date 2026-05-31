export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100" height="100" rx="20" fill="currentColor" />
      <path
        d="M25 40h15v35H25V40zm20 0h15v35H45V40zm20 0h15v35H65V40z"
        fill="white"
      />
      <path d="M20 35h60v5H20v-5z" fill="white" />
      <path d="M30 25l20-10 20 10H30z" fill="white" />
    </svg>
  );
}
