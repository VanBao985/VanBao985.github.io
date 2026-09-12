// Public Google Drive folders that feed the gallery.
//
// To add a year: share the folder as "Anyone with the link", copy the id out
// of its URL (drive.google.com/drive/folders/<THIS PART>), add an entry here,
// then redeploy. Order here is the order the chips appear in, and the chips
// only show up once there is more than one folder.
//
// Subfolders inside these folders are ignored on purpose — only images
// sitting directly in a folder are picked up. That is why the two folders
// below are listed explicitly rather than being found automatically.
export const DRIVE_FOLDERS = [
  { id: '1aj-6LSK9prM82FyeG1706QWqE8-hLvEU', name: 'Graduation Day 2026' },
  { id: '14UDkaVb4XAMJa-guy2Jw5LbE2Qi3p8Bf', name: 'CLB HTHT 2024' }
];
