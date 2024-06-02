'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import io from 'socket.io-client';
import sdk from '@crossmarkio/sdk';

export default function Room() {
  const { roomId } = useParams();
  const [address, setAddress] = useState<string | undefined>();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    sdk.mount
      .loop(200)
      .then(() => {
        const userAddress = sdk.methods.getAddress();
        setAddress(userAddress);
        if (userAddress) {
          if (userAddress === roomId) {
            setIsHost(true);
          }
          setIsAuthorized(true);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize SDK:', err);
      });
  }, [roomId]);

  useEffect(() => {
    if (isAuthorized && address) {
      initWebRTC(address);
    }
  }, [isAuthorized, address]);

  const initWebRTC = async (wallet: string) => {
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_IO_SERVER;
    if (!socketServerUrl) {
      throw new Error('Socket.IO server URL is not defined');
    }

    const socket = io(socketServerUrl);
    setSocket(socket);

    const pc = new RTCPeerConnection();
    setPeerConnection(pc);

    // WebSocket接続確認
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('message', async (message) => {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      if (data.offer) {
        console.log('Received offer:', data.offer);
        if (pc.signalingState !== 'stable') {
          console.error(
            'Cannot set remote offer in signaling state:',
            pc.signalingState
          );
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({ answer }));
        processIceCandidatesQueue();
      }

      if (data.answer) {
        console.log('Received answer:', data.answer);
        if (pc.signalingState !== 'have-local-offer') {
          console.error(
            'Cannot set remote answer in signaling state:',
            pc.signalingState
          );
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        processIceCandidatesQueue();
      }

      if (data.candidate) {
        console.log('Received ICE candidate:', data.candidate);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      }
    });

    if (isHost) {
      const mediaConstraints = { audio: true, video: false };
      const localStream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );
      console.log('Local stream:', localStream);

      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      localStream.getTracks().forEach((track) => {
        console.log('Adding track to peer connection:', track);
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Sending offer:', offer);
      socket.send(JSON.stringify({ offer }));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        socket.send(JSON.stringify({ candidate: event.candidate }));
      }
    };

    pc.ontrack = (event) => {
      console.log('Remote track received:', event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];

        // 音声が届いているかをログ出力
        console.log('Remote stream:', event.streams[0]);
        monitorAudio(event.streams[0]);
      }
    };
  };

  const processIceCandidatesQueue = () => {
    const pc = peerConnection;
    if (pc && pc.remoteDescription) {
      iceCandidatesQueue.current.forEach(async (candidate) => {
        console.log('Processing queued ICE candidate:', candidate);
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
      iceCandidatesQueue.current = [];
    }
  };

  const monitorAudio = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    source.connect(analyser);
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray);
      console.log('Analyser data array:', dataArray);
      const isAudioPlaying = dataArray.some((value) => value > 0);
      if (isAudioPlaying) {
        console.log('Audio is playing');
      } else {
        console.log('Audio is not playing');
      }
      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  };

  const connect = async () => {
    try {
      const signIn = await sdk.methods.signInAndWait();
      const userAddress = signIn.response.data.address;
      setAddress(userAddress);
      if (userAddress === roomId) {
        setIsHost(true);
      }
      setIsAuthorized(true);
    } catch (err) {
      console.error('Failed to authenticate:', err);
      alert('Failed to authenticate. Please connect your wallet.');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100'>
      {isAuthorized ? (
        <div className='bg-white p-8 rounded shadow-md'>
          <h1 className='text-2xl font-bold mb-6'>Voice Chat Room</h1>
          <video
            ref={localVideoRef}
            autoPlay
            muted={!isHost}
            className='mb-4'
          ></video>
          <video ref={remoteVideoRef} autoPlay className='mb-4'></video>
        </div>
      ) : (
        <button
          onClick={connect}
          className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700 transition'
        >
          Authenticate with CROSSMARK Wallet
        </button>
      )}
    </div>
  );
}
