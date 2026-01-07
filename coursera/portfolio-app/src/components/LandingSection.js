import React from 'react'
import { Avatar, Heading, VStack, Spacer } from '@chakra-ui/react'
import FullScreenSection from './FullScreenSection'

const greeting = 'Hello, I am Pete!'
const bio1 = 'A frontend developer'
const bio2 = 'specialised in React'

// Implement the UI for the LandingSection component according to the instructions.
// Use a combination of Avatar, Heading and VStack components.
const LandingSection = () => (
  <FullScreenSection
    justifyContent='center'
    alignItems='center'
    isDarkBackground
    backgroundColor='#2A4365'
  >
    <VStack
      spacing={6}
      align='center'
      justify='center'
      textAlign='center'
    >
      <Avatar name='Pete' size='xl' src='https://i.pravatar.cc/150?img=7' />
      <Heading as='h1' size='sm'>
        {greeting}
      </Heading>
      <Spacer />
      <Heading as='h1' size='2xl'>
        {bio1}
      </Heading>
      <Heading as='h1' size='2xl'>
        {bio2}
      </Heading>
    </VStack>
  </FullScreenSection>
)

export default LandingSection
