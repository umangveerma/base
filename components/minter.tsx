import { createQR } from '@solana/pay';
import { useEffect, useRef } from 'react';

export default function Minter() {
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qr = createQR(
      'solana:https%3A%2F%2Fapi.candypay.fun%2Fapi%2Fv1%2Fmint%3Fid%3De57b2d2fd4882e8aa89af3e6d651b31f?label=Made+with+love+by+CandyPay&message=Thanks+for+minting+the+NFTs%21',
      512,
      'transparent'
    );
    if (qrRef.current) {
      qrRef.current.innerHTML = '';
      qr.append(qrRef.current);
    }
  });

  return (
    <>
      <div ref={qrRef} />
    </>
  );
}
