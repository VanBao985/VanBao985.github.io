// Google Drive API key, used only by the per-guest photo pages.
//
// The gallery does not need this: its folders are known in advance and listed
// into a JSON file at build time. A guest's folder is different — its id only
// exists in the link they were handed, so nothing about it can be known when
// the site is built. Listing it has to happen in the browser, and the Drive
// REST API is the endpoint that allows that (it sends CORS headers, unlike the
// embeddedfolderview endpoint the build script uses).
//
// This key is a BROWSER key and ships in the bundle, exactly like the Supabase
// anon key. It is not a password: it can only read files that are already
// shared with "Anyone with the link". Restrict it anyway in the Google Cloud
// console, so a copy lifted from the bundle is useless elsewhere:
//
//   APIs & Services -> Credentials -> your key
//     - API restrictions:         Google Drive API only
//     - Application restrictions: HTTP referrers -> your site's origins
//
// Never put an OAuth client secret or a service-account key here — those are
// real credentials and would hand over the whole Drive account.
//
// Leave it empty and the photo pages render a "not connected yet" notice
// instead of breaking.
export const DRIVE_API = {
  key: 'AIzaSyDSywHS5pipBpM7yIwZ8tSvkUipoRrPfW8',
};

export const isDriveApiConfigured = () => Boolean(DRIVE_API.key);
