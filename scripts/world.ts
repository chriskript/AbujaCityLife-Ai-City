import { archiveDirSize, archiveWorld, listArchives, restoreWorld, startNewWorld } from '../server/persistence/world-archives.js';

// Stopped-backend-only society management. Never touches spending ledgers,
// policy, claims or access files. No secrets in argv, output or logs.
try {
  const [command, ...args] = process.argv.slice(2);
  const flags = Object.fromEntries(args.map(a => { const m = /^--([\w-]+)=(.+)$/.exec(a); if (!m) throw new Error('Use --name=value options'); return [m[1]!, m[2]!]; }));
  const runtime = flags.runtime ?? 'runtime', checkpoint = flags.checkpoint ?? 'neighbourhood-session.json';
  if (command === 'list') {
    if (Object.keys(flags).some(k => k !== 'runtime' && k !== 'checkpoint')) throw new Error('list accepts only --runtime= and --checkpoint=');
    const archives = await listArchives(runtime);
    if (!archives.length) console.log('No archived societies.');
    for (const archive of archives) console.log(JSON.stringify({ ...archive, bytes: await archiveDirSize(runtime, archive.archiveId) }));
  } else if (command === 'archive') {
    if (Object.keys(flags).some(k => k !== 'runtime' && k !== 'checkpoint')) throw new Error('archive accepts only --runtime= and --checkpoint=');
    const manifest = await archiveWorld(runtime, checkpoint);
    console.log(JSON.stringify({ archived: manifest.archiveId, sessionId: manifest.sessionId, residents: manifest.residents, simulationSeconds: manifest.simulationSeconds, interruptions: manifest.interruptions, files: manifest.files.map(f => f.name) }));
    if (manifest.interruptions) console.log(`Note: this society carries ${manifest.interruptions} interrupted decision(s) awaiting manual review; they are preserved in the archive.`);
  } else if (command === 'new') {
    if (Object.keys(flags).some(k => k !== 'runtime' && k !== 'checkpoint' && k !== 'confirm') || !flags.confirm) throw new Error('new requires --confirm=<live session id, or fresh-start when no checkpoint exists>');
    const manifest = await startNewWorld(runtime, checkpoint, flags.confirm);
    console.log(JSON.stringify({ preserved: manifest.archiveId, residents: manifest.residents, simulationSeconds: manifest.simulationSeconds }));
    console.log('Current society preserved. The next backend start creates a fresh sixteen-resident Unity Gardens world.');
  } else if (command === 'restore') {
    if (Object.keys(flags).some(k => k !== 'runtime' && k !== 'checkpoint' && k !== 'archive' && k !== 'confirm') || !flags.archive || !flags.confirm) throw new Error('restore requires --archive=<id> --confirm=<id>');
    const { restored, preserved } = await restoreWorld(runtime, checkpoint, flags.archive, flags.confirm);
    console.log(JSON.stringify({ restored: restored.archiveId, sessionId: restored.sessionId, residents: restored.residents, simulationSeconds: restored.simulationSeconds, interruptions: restored.interruptions, preservedBeforeRestore: preserved?.archiveId ?? null }));
    if (restored.interruptions) console.log(`Note: this society carries ${restored.interruptions} interrupted decision(s); the backend will start paused for manual review.`);
  } else throw new Error('Use world list [--runtime=dir] | archive [--runtime=dir] | new --confirm=<session id> [--runtime=dir] | restore --archive=<id> --confirm=<id> [--runtime=dir]. Stop the backend first.');
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
