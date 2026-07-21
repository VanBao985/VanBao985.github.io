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
  { id: '1__Z22t7OTdcVKMvFAZak2Kc2Qy6TNxWu', name: 'Graduation' },
  { id: '1VRARA0cZH-mkf85gtr2ekhwp6n34UYcY', name: 'Hall B1' },
  { id: '11kcHQLaL_qXLaADQhqWzf9IvwN4C-aTX', name: 'Photobooth' },
];
