import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '67zfq8ba',
    dataset: 'production'
  },
  /**
   * Auto-updates disabled: the studio is self-hosted on Vercel, and with this on,
   * `sanity build` prompts (y/N) on a local/runtime version mismatch. In CI the prompt
   * defaults to "N", exits 0 without writing dist/, and fails the Vercel deploy.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  autoUpdates: false,
})
