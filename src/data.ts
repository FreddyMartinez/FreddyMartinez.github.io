// Everything personal lives here — edit freely.

export const profile = {
  name: 'Freddy Martínez',
  role: 'Software Developer',
  tagline: 'I build things for the web — and occasionally for the real world.',
  about: [
    "Hi! I'm Freddy. Replace this paragraph with a short intro about who you are, what you work on and what you care about.",
    'A second paragraph is a good place for what you are currently learning or looking for.',
  ],
  email: 'fhmartinezq@gmail.com',
}

export const links = [
  { label: 'GitHub', href: 'https://github.com/FreddyMartinez' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/freddy-martinez-q/' },
]

export type Project = {
  title: string
  description: string
  tags: string[]
  href?: string
}

export const projects: Project[] = [
  {
    title: 'This website',
    description: 'A personal page built with React, Vite and React Three Fiber, deployed on GitHub Pages.',
    tags: ['React', 'Three.js', 'Vite'],
    href: 'https://github.com/FreddyMartinez/FreddyMartinez.github.io',
  },
  {
    title: 'Project two',
    description: 'Describe what it does, the problem it solves and what you learned.',
    tags: ['TypeScript', 'Node'],
  },
  {
    title: 'Project three',
    description: 'Another highlight. Keep it to one or two sentences.',
    tags: ['Python'],
  },
]
