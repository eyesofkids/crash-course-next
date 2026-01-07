import {
  Heading,
  HStack,
  Image,
  Text,
  VStack,
  Stack,
  StackDivider,
  Box,
  Link,
} from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
import React from 'react'

const Card = ({ title, description, imageSrc }) => {
  // Implement the UI for the Card component according to the instructions.
  // You should be able to implement the component with the elements imported above.
  // Feel free to import other UI components from Chakra UI if you wish to.
  return (
    <Stack
      spacing='2'
      borderRadius='15px'
      overflow='hidden'
      boxShadow='lg'
      backgroundColor='white'
      color='black'
    >
      <Box>
        <Image src={imageSrc} alt={title} borderRadius='15px' />
      </Box>
      <Box spacing='2' p='4'>
        <Heading size='md'>{title}</Heading>
      </Box>
      <Box spacing='2' px='4'>
        <Text>{description}</Text>
      </Box>
      <Box spacing='2' p='4'>
      <Text>
        <Link href={`#${title}`} >
        See more <FontAwesomeIcon icon={faArrowRight} size='1x' />
        </Link></Text>
      </Box>
    </Stack>
  )
}

export default Card
