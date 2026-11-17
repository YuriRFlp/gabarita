import Image from 'next/image';

export function Logo() {
  return (
    <>
      <Image
        src="/brand/gabarita-logo.svg"
        alt="Gabarita"
        width={160}
        height={32}
        priority
        unoptimized
        className="gb-logo gb-logo--light-theme"
      />
      <Image
        src="/brand/gabarita-logo-white.svg"
        alt="Gabarita"
        width={160}
        height={32}
        priority
        unoptimized
        className="gb-logo gb-logo--dark-theme"
      />
    </>
  );
}
