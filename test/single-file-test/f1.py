import os
import subprocess
import sys

directory = os.path.dirname(os.path.realpath(__file__))

BACKEND_DIR = "."
LIBS_DIR = "../autogpt_libs"
TARGET_DIRS = [BACKEND_DIR, LIBS_DIR]


def run(*command: str) -> None:
    print(f">>>>> Running poetry run {' '.join(command)}")
    try:
        subprocess.run(
            ["poetry", "run"] + list(command),
            cwd=directory,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
    except subprocess.CalledProcessError as e:
        print(e.output.decode("utf-8"), file=sys.stderr)
        raise


def lint():
    lint_step_args: list[list[str]] = [
        ["ruff", "check", *TARGET_DIRS, "--exit-zero"],
        ["ruff", "format", "--diff", "--check", LIBS_DIR],
        ["isort", "--diff", "--check", "--profile", "black", BACKEND_DIR],
        ["black", "--diff", "--check", BACKEND_DIR],
        ["pyright", *TARGET_DIRS],
    ]
    lint_error = None
    for args in lint_step_args:
        try:
            run(*args)
        except subprocess.CalledProcessError as e:
            lint_error = e

    if lint_error:
        print("Lint failed, try running `poetry run format` to fix the issues")
        sys.exit(1)


def format():
    run("ruff", "check", "--fix", *TARGET_DIRS)
    run("ruff", "format", LIBS_DIR)
    run("isort", "--profile", "black", BACKEND_DIR)
    run("black", BACKEND_DIR)
    run("pyright", *TARGET_DIRS)


def check_diff():
    print(">>>>> Checking for file diffs (without modifying files)...")
    diff_commands = [
        ["ruff", "format", "--diff", "--check", LIBS_DIR],
        ["isort", "--diff", "--check", "--profile", "black", BACKEND_DIR],
        ["black", "--diff", "--check", BACKEND_DIR],
    ]
    has_diff = False
    for args in diff_commands:
        try:
            run(*args)
        except subprocess.CalledProcessError:
            has_diff = True

    if has_diff:
        print(">>> Differences detected in files. Run `poetry run format` to auto-fix.")
        sys.exit(1)
    else:
        print(">>> No diffs detected. Code is properly formatted.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "lint":
            lint()
        elif cmd == "format":
            format()
        elif cmd == "check-diff":
            check_diff()
        else:
            print("Usage: python script.py [lint|format|check-diff]")
    else:
        print("Usage: python script.py [lint|format|check-diff]")
