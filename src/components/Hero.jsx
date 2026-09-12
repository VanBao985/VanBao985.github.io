export default function Hero({ total = 0, folders = [], activeFolder, onFolderChange }) {
  return (
    <section id="photos" className="wrap hero">
      <p className="hero__eyebrow">A personal collection · Bộ sưu tập cá nhân</p>
      <h1>
        Days we will <em>always remember</em>
      </h1>
      <p className="hero__lede">
        Four years of lecture halls, spontaneous trips, late nights spent
        racing deadlines and lasting friendships — all gathered here in photographs. <br/>
        Bốn năm giảng đường, những chuyến đi bất chợt, những đêm chạy deadline
        và tình bạn đẹp — tất cả được lưu lại qua từng khung hình.
      </p>

      {total > 0 && (
        <div className="hero__stats">
          <div className="stat">
            <span className="stat__num">{total}</span>
            <span className="stat__label">Khoảnh khắc</span>
          </div>

          {/* Only worth showing chips once there is more than one folder */}
          {folders.length > 1 && (
            <div className="chips hero__folders" role="group" aria-label="Filter by folder">
              <button
                className="chip"
                aria-pressed={activeFolder === 'all'}
                onClick={() => onFolderChange('all')}
              >
                Tất cả<span className="chip__count">{total}</span>
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
