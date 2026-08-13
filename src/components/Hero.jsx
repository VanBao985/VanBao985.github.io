export default function Hero({ total = 0, folders = [], activeFolder, onFolderChange }) {
  return (
    <section id="photos" className="wrap hero">
      <p className="hero__eyebrow">A personal collection</p>
      <h1>
        Days that <em>won't come back</em>
      </h1>
      <p className="hero__lede">
        Four years of lecture halls, spontaneous trips, deadline nights and
        friends — gathered here before the memories fade. <br/>
        Hành trình 4 năm đại học — được lưu giữ ở đây trước khi ký ức phai nhạt.
      </p>

      {total > 0 && (
        <div className="hero__stats">
          <div className="stat">
            <span className="stat__num">{total}</span>
            <span className="stat__label">Moments</span>
          </div>

          {/* Only worth showing chips once there is more than one folder */}
          {folders.length > 1 && (
            <div className="chips hero__folders" role="group" aria-label="Filter by folder">
              <button
                className="chip"
                aria-pressed={activeFolder === 'all'}
                onClick={() => onFolderChange('all')}
              >
                All<span className="chip__count">{total}</span>
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="chip"
                  aria-pressed={activeFolder === folder.id}
                  onClick={() => onFolderChange(folder.id)}
                >
                  {folder.name}
                  <span className="chip__count">{folder.photos.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
