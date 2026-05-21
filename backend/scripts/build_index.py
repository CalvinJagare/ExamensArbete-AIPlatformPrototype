import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.indexer import rebuild_index, CHUNKS_FILE, CORPUS_DIR  # noqa: E402


def main() -> int:
    if not CORPUS_DIR.exists():
        print(f"No corpus directory at {CORPUS_DIR}", file=sys.stderr)
        return 1

    result = rebuild_index()
    for f in result["files"]:
        if "error" in f:
            print(f"  ! {f['filename']}: {f['error']}", file=sys.stderr)
        else:
            print(f"  + {f['filename']}: {f['chunk_count']} chunks")
    print(f"\nWrote {result['total_chunks']} chunks → {CHUNKS_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
