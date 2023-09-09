import {
  ActionIcon,
  Flex,
  Skeleton,
  Stack,
  Switch,
  Text,
  Tooltip,
  createStyles,
} from '@mantine/core'
import React from 'react'
import { BiMicrophone, BiVideo } from 'react-icons/bi'
import { FaRegWindowRestore } from 'react-icons/fa'
import { LuScreenShare } from 'react-icons/lu'
import { TbHeadphones, TbHeadphonesOff } from 'react-icons/tb'

const useStyles = createStyles((theme) => ({
  huddle: {
    // overflow: 'hidden',
    position: 'absolute',
    bottom: '0',
    left: '0',
    zIndex: 10,
    padding: theme.spacing.md,
    borderRadius: '1rem',
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.dark[4]}`,
    backgroundColor: theme.colors.dark[7],
    width: '100%',
  },
  video: {
    height: 100,
    borderRadius: '1rem',
    border: `1px solid ${theme.colors.dark[4]}`,
  },
}))

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

export default function Huddle({ selected, theme, socket, userId }: any) {
  const { classes } = useStyles()

  const [checked, setChecked] = React.useState(false)
  const [connectedUsers, setConnectedUsers] = React.useState({})
  const localVideoRef = React.useRef<any>()
  const remoteVideoRefs = React.useRef<
    Record<string, React.RefObject<HTMLVideoElement>>
  >({})
  const pcRefs = React.useRef<Record<string, RTCPeerConnection>>({})

  // Function to set up a peer connection and resolve when done
  async function setupPeerConnection(user: string) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    })
    localVideoRef.current.srcObject = stream
    const pc = new RTCPeerConnection(config)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to the other peer via Socket.io
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          senderUserId: user,
        })
      }
    }

    pc.onconnectionstatechange = (e) => {
      console.log('Connection state:', pc.connectionState)
    }

    pc.ontrack = (event) => {
      // Create a new video element
      const newVideoElement = document.createElement('video')
      newVideoElement.autoplay = true
      newVideoElement.playsInline = true

      // Set the srcObject to the event stream
      newVideoElement.srcObject = event.streams[0]

      // Find the container element by classname
      const videoContainer = document.querySelector('.video-container')

      if (videoContainer) {
        // Append the new video element to the container
        videoContainer.appendChild(newVideoElement)
      }
    }

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    pcRefs.current[user] = pc
  }

  async function setupWebRTC() {
    try {
      await setupPeerConnection(userId)

      // Emit the "join-room" event when the user starts the call
      socket.emit('join-room', { roomId: selected?._id, userId })

      // Listen for the "join-room" event to trigger a call when another user joins
      socket.on('join-room', ({ roomId, otherUserId }: any) => {
        console.log(`User ${otherUserId} joined room ${roomId}`)
        setConnectedUsers((prevUsers) => ({
          ...prevUsers,
          [otherUserId]: true,
        }))
      })

      // Event listener for receiving SDP offers from other users
      socket.on('offer', ({ offer, senderUserId }: any) => {
        handleOffer(offer, senderUserId)
      })

      // Event listener for receiving SDP answers from other users
      socket.on('answer', ({ answer, senderUserId }: any) => {
        handleAnswer(answer, senderUserId)
      })

      // Event listener for receiving ICE candidates from other users
      socket.on('ice-candidate', (candidate: any, senderUserId: string) => {
        handleIceCandidate(candidate, senderUserId)
      })
    } catch (error) {
      console.log('Error setting up WebRTC:', error)
    }
  }

  React.useEffect(() => {
    if (checked) {
      setupWebRTC()
      return () => {
        // Clean up resources (close the peer connections, stop media streams, etc.)
        for (const user in pcRefs.current) {
          if (pcRefs.current[user]) {
            pcRefs.current[user].close()
          }
        }
      }
    }

    return () => {
      socket.off('join-room')
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [checked])

  React.useEffect(() => {
    async function setupPeerConnections() {
      for (const user in connectedUsers) {
        // // Wait for the peer connection to be set up
        await setupPeerConnection(user)
        // Trigger a call when another user joins
        await initiateCall(user)
      }
    }
    if (connectedUsers) {
      setupPeerConnections()
    }
  }, [connectedUsers])

  // Function to send an SDP offer to another user
  function sendOffer(offer: any, targetUserId: string) {
    if (targetUserId) {
      console.log('offer was sent', offer)
      // Send the offer to the target user via Socket.io
      socket.emit('offer', { offer, targetUserId })
    }
  }

  // Function to send an SDP answer to another user
  function sendAnswer(answer: any, senderUserId: string) {
    console.log('answer was sent', answer)
    // Send the answer to the other user via Socket.io
    socket.emit('answer', { answer, senderUserId })
  }

  // Function to initiate a call
  async function initiateCall(targetUserId: string) {
    try {
      // Create an SDP offer
      const offer = await pcRefs.current[targetUserId]?.createOffer()
      await pcRefs.current[targetUserId]?.setLocalDescription(offer)

      const localDescription = pcRefs.current[targetUserId]?.localDescription
      if (localDescription) {
        // Send the offer along with the targetUserId
        sendOffer(localDescription, targetUserId)
      } else {
        console.log('Local description is null')
      }
    } catch (error) {
      console.log('Error creating and sending offer:', error)
    }
  }

  // Function to handle an incoming SDP offer
  async function handleOffer(offer: any, senderUserId: string) {
    try {
      // console.log(pcRefs.current[senderUserId], 'handle offer')
      await pcRefs.current[senderUserId].setRemoteDescription(offer)
      // Create an answer
      const answer = await pcRefs.current[senderUserId].createAnswer()
      // Set the local description
      await pcRefs.current[senderUserId].setLocalDescription(answer)
      // Send the answer back to the sender
      sendAnswer(pcRefs.current[senderUserId].localDescription, senderUserId)
    } catch (error) {
      console.error('Error handling offer:', error)
    }
  }

  // Function to handle an incoming SDP answer
  function handleAnswer(answer: any, senderUserId: string) {
    console.log(senderUserId, 'handleAnswer')
    // Set the remote description with the received answer
    console.log('answer set as remote description', answer)
    pcRefs.current[senderUserId]?.setRemoteDescription(answer)
  }

  // Function to handle an incoming ICE candidate
  function handleIceCandidate(candidate: any, senderUserId: string) {
    // Add the received ICE candidate to the peer connection
    candidate = new RTCIceCandidate(candidate)
    console.log('Received ICE candidate:', candidate, senderUserId)
    // Add the received ICE candidate to the peer connection
    pcRefs.current[senderUserId]
      ?.addIceCandidate(candidate)
      .catch((error: any) => {
        console.error('Error adding ICE candidate:', error)
      })
  }

  return (
    <Stack w="100%" className={classes.huddle}>
      {checked && (
        <Stack w="100%">
          <Flex align="center" justify="space-between">
            <Text tt="lowercase" size="sm">
              {selected?.isChannel && '#'}
              {selected?.name}
            </Text>
            <Tooltip label="Open mini window" withArrow position="top">
              <ActionIcon onClick={() => {}} variant="default" size={40}>
                <FaRegWindowRestore size="1.3rem" />
              </ActionIcon>
            </Tooltip>
          </Flex>

          <Flex align="center" gap="sm" className="video-container">
            <video
              autoPlay
              playsInline
              ref={localVideoRef}
              className={classes.video}
            />
          </Flex>
          <Flex gap="sm" align="center">
            <Tooltip label="Mute mic" withArrow position="top">
              <ActionIcon onClick={() => {}} variant="default" size={40}>
                <BiMicrophone size="1.7rem" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Turn on video" withArrow position="top">
              <ActionIcon onClick={() => {}} variant="default" size={40}>
                <BiVideo size="2rem" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Share screen" withArrow position="top">
              <ActionIcon onClick={() => {}} variant="default" size={40}>
                <LuScreenShare size="1.6rem" />
              </ActionIcon>
            </Tooltip>
            <Switch
              ml="auto"
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
              size="xl"
              color={theme.colorScheme === 'dark' ? 'gray' : 'dark'}
              onLabel={
                <TbHeadphonesOff size="1.5rem" color={theme.colors.red[4]} />
              }
              offLabel={
                <TbHeadphones size="1.5rem" color={theme.colors.blue[6]} />
              }
            />
          </Flex>
        </Stack>
      )}
      {!checked && (
        <Flex align="center" justify="space-between">
          {!selected?.name && <Skeleton height={15} width={150} radius="md" />}
          {selected?.name && (
            <Text tt="lowercase" size="sm">
              {selected?.isChannel && '#'}
              {selected?.name}
            </Text>
          )}
          <Switch
            checked={checked}
            onChange={(event) => setChecked(event.currentTarget.checked)}
            size="xl"
            color={theme.colorScheme === 'dark' ? 'gray' : 'dark'}
            onLabel={
              <TbHeadphonesOff size="1.5rem" color={theme.colors.red[4]} />
            }
            offLabel={
              <TbHeadphones size="1.5rem" color={theme.colors.blue[6]} />
            }
          />
        </Flex>
      )}
    </Stack>
  )
}
