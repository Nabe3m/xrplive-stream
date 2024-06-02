'use client';

import { useState, useEffect } from 'react';
import sdk from '@crossmarkio/sdk';
import { useRouter } from 'next/navigation';

export default function Authenticate() {
  const [address, setAddress] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    sdk.mount
      .loop(200)
      .then(() => {
        const userAddress = sdk.methods.getAddress();
        setAddress(userAddress);
        if (userAddress) {
          const returnUrl =
            new URLSearchParams(window.location.search).get('returnUrl') || '/';
          router.replace(returnUrl.toString());
        }
      })
      .catch((err) => {
        console.error('Failed to initialize SDK:', err);
      });
  }, []);

  const connect = async () => {
    try {
      const signIn = await sdk.methods.signInAndWait();
      const userAddress = signIn.response.data.address;
      setAddress(userAddress);
      const returnUrl =
        new URLSearchParams(window.location.search).get('returnUrl') || '/';
      router.replace(returnUrl.toString());
    } catch (err) {
      console.error('Failed to authenticate:', err);
      alert('Failed to authenticate. Please connect your wallet.');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='bg-white p-8 rounded shadow-md'>
        <h1 className='text-2xl font-bold mb-6'>
          XRPL Voice Chat Authentication
        </h1>
        <button
          onClick={connect}
          className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition'
        >
          Authenticate with CROSSMARK Wallet
        </button>
      </div>
    </div>
  );
}
