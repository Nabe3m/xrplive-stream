'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import sdk from '@crossmarkio/sdk';
import { useRouter } from 'next/navigation';

export default function CreateRoom() {
  const [inviteUrl, setInviteUrl] = useState<string>('');
  const [address, setAddress] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    sdk.mount
      .loop(200)
      .then(() => {
        const userAddress = sdk.methods.getAddress();
        setAddress(userAddress);
        if (!userAddress) {
          router.push(`/authenticate?returnUrl=/create-room`);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize SDK:', err);
      });
  }, []);

  const createInvite = async () => {
    if (address) {
      setIsGenerating(true);
      const response = await axios.post('/api/invite', { userId: address });
      setInviteUrl(response.data.inviteUrl);
    } else {
      alert('Failed to create invite. Please connect your wallet.');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      <div className='bg-white p-8 rounded shadow-md'>
        <h1 className='text-2xl font-bold mb-6'>Create Room</h1>
        {!isGenerating && (
          <button
            onClick={createInvite}
            className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition mb-4'
          >
            Generate Invite URL
          </button>
        )}
        {inviteUrl && (
          <p>
            Invite URL:{' '}
            <a href={inviteUrl} className='text-blue-500'>
              {inviteUrl}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
