import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: 'discord-verification-bot-webpage-7tk0rize',
  authRequired: false // We'll handle auth manually for this system
})