import React from "react";

export function PhonePeLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="https://download.logo.wine/logo/PhonePe/PhonePe-Logo.wine.png"
      alt="PhonePe"
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback to official Wikimedia SVG if mirror fails
        (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg";
      }}
    />
  );
}

export function FamPayLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="https://fampay.in/static/fampay-logo-yellow-5c2e3995eb87b643a6d90a501e74a814.svg"
      alt="FamPay"
      className={`${className} object-contain rounded-lg`}
      onError={(e) => {
        // Fallback to high-res badge if main URL is blocked
        (e.target as HTMLImageElement).src = "https://play-lh.googleusercontent.com/rN5nO5B77M8X-93F9O854W1z_5N_987654321";
      }}
    />
  );
}

export function GooglePayLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg"
      alt="Google Pay"
      className={`${className} object-contain`}
    />
  );
}

export function PaytmLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="https://download.logo.wine/logo/Paytm/Paytm-Logo.wine.png"
      alt="Paytm"
      className={`${className} object-contain`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = "https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo.jpg";
      }}
    />
  );
}

export function BhimUpiLogo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg"
      alt="BHIM UPI"
      className={`${className} object-contain`}
    />
  );
}
