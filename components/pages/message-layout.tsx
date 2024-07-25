import {
  Avatar,
  Center,
  Flex,
  Modal,
  MultiSelect,
  Paper,
  Skeleton,
  Text,
  ThemeIcon,
  createStyles,
} from '@mantine/core'
import React from 'react'
import { getColorByIndex, getColorHexByIndex } from '../../utils/helpers'
import { LuUserPlus } from 'react-icons/lu'
import dynamic from 'next/dynamic'
import { useDisclosure } from '@mantine/hooks'
import { useForm } from '@mantine/form'
import Button from '../button'
import { useMutation } from '@tanstack/react-query'
import axios from '../../services/axios'
import { notifications } from '@mantine/notifications'
import { useAppContext } from '../../providers/app-provider'
import { ApiError, MessageLayoutProps, User } from '../../utils/interfaces'
const Message = dynamic(() => import('../message'), {
  ssr: false,
})

const useStyles = createStyles((theme) => ({
  select: {
    paddingBlock: theme.spacing.sm,
    paddingInline: theme.spacing.sm,
  },
  values: {
    gap: theme.spacing.sm,
  },
}))

export default function MessageLayout({
  type,
  messagesLoading,
}: MessageLayoutProps) {
  const {
    theme,
    refreshApp,
    selected,
    data: organisationData,
  } = useAppContext()
  const { classes } = useStyles()
  const [isDisabled, setIsDisabled] = React.useState(true)
  const [channelCollaborators, setChannelCollaborators] = React.useState(
    selected?.collaborators?.map((d: User) => d._id)
  )

  const isLoading = !selected?.name
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm({
    initialValues: {
      userIds: [''],
      channelId: selected?._id,
    },
    validate: {
      userIds: (val) =>
        val.length > 0 ? null : 'En az bir kişi seçilmelidir',
    },
  })

  const mutation = useMutation({
    mutationFn: (body) => {
      return axios.post('/teammates', body)
    },
    onError(error: ApiError) {
      notifications.show({
        message: error?.response?.data?.data?.name,
        color: 'red',
        p: 'md',
      })
    },
    onSuccess() {
      refreshApp()
      close()
      form.reset()
      notifications.show({
        message: `Takım arkadaşı başarıyla eklendi`,
        color: 'green',
        p: 'md',
      })
    },
  })

  const collaboratorsToRemove = selected?.collaborators?.map((c: User) => c._id)

  const removeCollaboratorsFromCoworkers = organisationData?.coWorkers?.filter(
    (c: User) => {
      return !collaboratorsToRemove?.includes?.(c._id)
    }
  )

  const coWorkersSelect = removeCollaboratorsFromCoworkers?.map((c: User) => {
    return {
      value: c._id,
      label: c.email,
    }
  })

  const joinMutation = useMutation({
    mutationFn: () => {
      return axios.post(`/channel/${selected?._id}`, {
        userId: organisationData?.profile?._id,
      })
    },
    onError(error: ApiError) {
      notifications.show({
        message: error?.response?.data?.data?.name,
        color: 'red',
        p: 'md',
      })
    },
    onSuccess() {
      refreshApp()
      setChannelCollaborators((collaborators) => [
        ...(collaborators as string[]),
        organisationData?.profile?._id as string,
      ])
      notifications.show({
        message: `Başarılı bir şekilde ${selected?.name} kanalına katıldınız!`,
        color: 'green',
        p: 'md',
      })
    },
  })

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={`Şu kanala ekle #${selected?.name}`}
        centered
        size="45.25rem"
        radius="lg"
        padding="xl"
        overlayProps={{
          color: theme.colors.dark[9],
          opacity: 0.55,
          blur: 2,
        }}
      >
        <MultiSelect
          classNames={{
            input: classes.select,
            values: classes.values,
          }}
          onChange={(val) => {
            form.setFieldValue('userIds', val)
            setIsDisabled(false)
          }}
          searchable
          nothingFound="Burada bir şey yok !"
          valueComponent={({ label }) => (
            <Flex gap="sm">
              <Avatar
                src={`/avatars/${label?.[0].toLowerCase()}.png`}
                size="md"
                color={getColorByIndex(label)}
                radius="xl"
              >
                {label[0].toLowerCase()}
              </Avatar>
              <Text>{label}</Text>
            </Flex>
          )}
          radius="md"
          data={coWorkersSelect as any}
          placeholder="Takım arkadaşı seç"
        />

        <Text fz="xs" mt="lg">
        Ekip arkadaşlarınızı da davet ederek ekip işbirliğinizi genişletin
        #{selected?.name} kanalı. İçgörülerinizi paylaşın ve birlikte daha fazlasını başarın.
        </Text>
        <Flex align="center" gap="md" mt="lg">
          <Button
            disabled={isDisabled}
            onClick={() =>
              mutation.mutate({
                userIds: form.values.userIds,
                channelId: selected?._id,
              } as any)
            }
            loading={mutation.isLoading}
            type="submit"
          >
            {mutation.isLoading ? '' : 'Davet gönder'}
          </Button>
        </Flex>
      </Modal>
      <Flex
        direction="column"
        justify="space-between"
        style={{
          position: 'relative',
        }}
      >
        <Flex
          bg={theme.colors.dark[7]}
          py={selected?.isChannel ? '1rem' : '1.85rem'}
          px="1.85rem"
          align="center"
          justify="space-between"
          style={{
            borderBottom: `1px solid ${theme.colors.dark[4]}`,
          }}
        >
          {isLoading && <Skeleton height={15} width={150} radius="md" />}
          {type === 'channel' && !isLoading && (
            <Text># {String(selected?.name)?.toLowerCase()}</Text>
          )}
          {type === 'conversation' && !isLoading && (
            <Flex gap="sm">
              <Avatar
                src={`/avatars/${selected?.name[0].toLowerCase()}.png`}
                size="md"
                radius="xl"
              ></Avatar>
              <Text>{String(selected?.name)?.toLowerCase()}</Text>
            </Flex>
          )}

          {selected?.isChannel && (
            <Paper radius="md" p="sm" px="md" withBorder>
              <Flex align="center">
                {selected?.collaborators?.map(
                  (collaborator: User, index: number) => (
                    <Avatar
                      key={index}
                      ml="-1rem"
                      size="md"
                      style={{
                        border: `2px solid ${theme.colors.dark[7]}`,
                        backgroundColor: getColorHexByIndex(index),
                      }}
                      opacity={1}
                      radius="xl"
                    >
                      {collaborator?.username?.[0].toUpperCase()}
                    </Avatar>
                  )
                )}
                <Text
                  pl="sm"
                  pr="lg"
                  size="sm"
                  style={{
                    borderRight: `1px solid ${theme.colors.dark[4]}`,
                  }}
                >
                  {selected?.collaborators?.length}
                </Text>
                <ThemeIcon
                  size="2.5rem"
                  radius="md"
                  variant="gradient"
                  ml="xl"
                  gradient={{ from: '#202020', to: '#414141', deg: 35 }}
                  onClick={open}
                  style={{
                    cursor: 'pointer',
                  }}
                >
                  <LuUserPlus size="1.5rem" color="white" />
                </ThemeIcon>
              </Flex>
            </Paper>
          )}
        </Flex>

        {selected && (
          <Message
            isLoading={isLoading}
            messagesLoading={messagesLoading}
            type={type}
            open={open}
          />
        )}

        {!channelCollaborators?.includes(
          organisationData?.profile?._id as string
        ) &&
          selected?.isChannel && (
            <Center>
              <Paper radius="lg" p="xl" withBorder mt="-4rem">
                <Text align="center" fz="sm" mb="md">
                 Bu kanala katılmaya hazır ol ! :{' '}
                  <Text span fw="bold">
                    {' '}
                    #{selected?.name}
                  </Text>
                  ? <br /> Sohbete katılın, ekibinizle işbirliği yapın,
                  
                </Text>
                <Center>
                  <Button
                    disabled={joinMutation.isLoading}
                    onClick={() => joinMutation.mutate()}
                    loading={joinMutation.isLoading}
                    type="submit"
                  >
                    <Text align="center">
                      {joinMutation.isLoading ? '' : 'Kanala Katıl'}
                    </Text>
                  </Button>
                </Center>
              </Paper>
            </Center>
          )}
      </Flex>
    </>
  )
}
