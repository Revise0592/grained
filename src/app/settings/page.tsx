const SETTINGS_SECTIONS = [
  {
    title: 'Metadata Defaults',
    description: 'Choose baseline metadata values used when creating or importing new rolls.',
  },
  {
    title: 'Import Defaults',
    description: 'Set preferred behavior for ZIP imports, filename handling, and date inference.',
  },
  {
    title: 'Display Preferences',
    description: 'Configure theme and archive display density defaults for the UI.',
  },
  {
    title: 'Library Behavior',
    description: 'Control how camera and film stock values are remembered in your library.',
  },
  {
    title: 'Data Safety',
    description: 'Review safeguards around destructive actions and metadata overwrites.',
  },
]

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Global defaults and behavior controls for your Grained workspace.
        </p>
      </header>

      <div className="grid gap-4">
        {SETTINGS_SECTIONS.map(section => (
          <section key={section.title} className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{section.title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{section.description}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
