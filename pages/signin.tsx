import React from 'react'
import {
  Center,
  Flex,
  Text,
  Stack,
  Paper,
  Divider,
  Button as MantineButton,
  Anchor,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import SlackLogo from '../components/slack-logo'
import Input from '../components/input'
import Button from '../components/button'
import { BiLogoGoogle } from 'react-icons/bi'
import { IoLogoGithub } from 'react-icons/io'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import axios from '../services/axios'
import { notifications } from '@mantine/notifications'
import { NextPage } from 'next'
import { ApiError } from '../utils/interfaces'

const Signin: NextPage = () => {
  const router = useRouter()
  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
    },
  })

  const mutation = useMutation({
    mutationFn: (body) => {
      return axios.post('/auth/signin', body)
    },
    onError(error: ApiError) {
      notifications.show({
        message: error?.response?.data?.data?.name,
        color: 'red',
        p: 'md',
      })
    },
    onSuccess() {
      localStorage.setItem('signUpEmail', form.values.email)
      router.push('/verify')
    },
  })

  return (
    <Center p="xl" h="100vh" w="100vw" bg="#111317">
      <Stack justify="between">
        <Flex direction="column" align="center">
          <SlackLogo />
          <Text fz="3xl" fw={600} mt="3xl" c="white">
            Qnter'a giriş yap.
          </Text>
          <Text fz="sm" mt="xs">
           İşiniz için kullandığınız{' '}
            <Text span fw={600}>
              mail adresini kullanmanızı öneririz.
            </Text>
          </Text>

          <Paper radius="md" p="xl" withBorder w={'40rem'} mt="xl">
            <form
              onSubmit={form.onSubmit(() =>
                mutation.mutate({ email: form.values.email } as any)
              )}
            >
              <Stack>
                <Input
                  required
                  label="Email"
                  placeholder="kişi@domain.xyz"
                  value={form.values.email}
                  onChange={(event) =>
                    form.setFieldValue('email', event.currentTarget.value)
                  }
                  error={form.errors.email && 'Geçersiz mail adresi'}
                />
                <Button loading={mutation.isLoading} type="submit">
                  {mutation.isLoading ? '' : 'Email ile giriş yap'}
                </Button>
                <Divider label="or" labelPosition="center" my="md" />
                <MantineButton
                  leftIcon={<BiLogoGoogle size="1.8rem" />}
                  radius="md"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `${process.env.NEXT_PUBLIC_API}/auth/google/callback`,
                      '_self'
                    )
                  }}
                  styles={(theme) => ({
                    root: {
                      backgroundColor: 'transparent',
                      border: '1px solid #373A40',
                      height: '4.5rem',
                      fontSize: '1.2rem',
                      '&:not([data-disabled])': theme.fn.hover({
                        backgroundColor: theme.fn.darken('#373A40', 0.05),
                        transition: 'background-color .3s ease',
                      }),
                    },

                    leftIcon: {
                      marginRight: theme.spacing.md,
                    },
                  })}
                >
                  Google ile giriş yap
                </MantineButton>
                <Stack spacing="xs" mt="lg">
                  <Text size="xs" align="center">
                    Qnter'da yeni misin ?
                  </Text>
                  <Anchor size="xs" align="center" href="/register">
                    Hesap Oluştur
                  </Anchor>
                </Stack>
              </Stack>
            </form>
          </Paper>
        </Flex>

        <Center p="xl">
          <MantineButton
            component="a"
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/adeolaadeoti"
            leftIcon={<IoLogoGithub size="1.4rem" />}
            styles={(theme) => ({
              root: {
                backgroundColor: 'transparent',
                fontSize: '1.2rem',
                fontWeight: 300,
                color: '#737780',
                '&:not([data-disabled])': theme.fn.hover({
                  color: theme.fn.darken('#373A40', 0.08),
                  backgroundColor: 'transparent',
                }),
              },
              leftIcon: {
                marginRight: theme.spacing.xs,
              },
            })}
          >
            adeolaadeoti
          </MantineButton>
        </Center>
      </Stack>
    </Center>
  )
}

export default Signin
