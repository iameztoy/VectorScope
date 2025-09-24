"""Utility script to list files within a folder."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable, List

# Toggle this flag to prevent ``.txt`` files from being listed.
EXCLUDE_TEXT_FILES = False


def list_files(folder: Path, exclude_txt: bool = EXCLUDE_TEXT_FILES) -> List[Path]:
    """Return a list of all file paths contained within ``folder``.

    Parameters
    ----------
    folder:
        Path to the directory whose files should be listed.
    exclude_txt:
        When ``True``, ``.txt`` files are filtered out of the returned list.

    Returns
    -------
    List[Path]
        A list of absolute paths to every file (not directory) contained in
        ``folder`` and its subdirectories.
    """
    if not folder.exists():
        raise FileNotFoundError(f"Folder does not exist: {folder}")
    if not folder.is_dir():
        raise NotADirectoryError(f"Path is not a directory: {folder}")

    files: List[Path] = []
    for root, _, filenames in os.walk(folder):
        for filename in filenames:
            if exclude_txt and filename.lower().endswith(".txt"):
                continue
            files.append(Path(root, filename))
    return files


def main(argv: Iterable[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="List all files in a folder")
    parser.add_argument("folder", type=Path, help="Folder to scan for files")
    args = parser.parse_args(argv)

    for file_path in list_files(args.folder):
        print(file_path)


if __name__ == "__main__":
    main()
