/**
 * Photo `src` values in memories.json are stored as site-root-relative URL
 * paths ("images/..."). Resolving them against BASE_URL keeps them correct
 * from any route depth — a bare relative path would break on a nested route
 * such as /albums/xyz — and survives a future move to a project Pages site.
 */
export const assetUrl = (path) =>
  `${import.meta.env.BASE_URL}${String(path ?? '').replace(/^\//, '')}`;
