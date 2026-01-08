import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope } from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faLinkedin,
  faMedium,
  faStackOverflow,
} from "@fortawesome/free-brands-svg-icons";
import { Box, HStack, Flex ,Link} from "@chakra-ui/react";
import useScrollDirection from '../hooks/useScrollDirection';

const socials = [
  {
    icon: faEnvelope,
    url: "mailto: hello@example.com",
  },
  {
    icon: faGithub,
    url: "https://github.com",
  },
  {
    icon: faLinkedin,
    url: "https://www.linkedin.com",
  },
  {
    icon: faMedium,
    url: "https://medium.com",
  },
  {
    icon: faStackOverflow,
    url: "https://stackoverflow.com",
  },
];

const Header = () => {
  // Get the scroll direction
  const scrollDirection = useScrollDirection();

  // Handle the click event
  const handleClick = (anchor) => () => {
    const id = `${anchor}-section`;
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <Box
      position="fixed"
      top={scrollDirection === 'down' ? '-66px' : '0'}
      left={0}
      right={0}
      translateY={scrollDirection === "down" ? 0 : -66}
      transitionProperty="transform"
      transitionDuration=".3s"
      transitionTimingFunction="ease-in-out"
      transition='top 0.3s ease-in-out' 
      backgroundColor="#18181b"
    >
      <Box color="white" maxWidth="1280px" margin="0 auto">
        <HStack
          px={16}
          py={4}
          justifyContent="space-between"
          alignItems="center"
        >
          <nav>
            {/* Add social media links based on the `socials` data */}
            <Flex gap="6" justify="space-between">
            {socials.map((social, index) => (
              <a href={social.url} key={index} target="_blank">
                <FontAwesomeIcon icon={social.icon} size="2x" />
              </a>
            ))}
            </Flex>
          </nav>
          <nav>
            <HStack spacing={8}>
              {/* Add links to Projects and Contact me section */}
              <Link href="#projects" onClick={handleClick("projects")}>Projects</Link>
              <Link href="#contact-me" onClick={handleClick("contactme")}>Contact Me</Link>
            </HStack>
          </nav>
        </HStack>
      </Box>
    </Box>
  );
};
export default Header;
