echo "PROBE: pwd=$(pwd)"; ls -la | head -5
echo "PROBE: git=$(command -v git) ver=$(git --version 2>&1)"
echo "PROBE: inside=$(git rev-parse --is-inside-work-tree 2>&1) shallow=$(git rev-parse --is-shallow-repository 2>&1) count=$(git rev-list --count HEAD 2>&1)"
echo "PROBE: remotes=$(git remote -v 2>&1 | head -2 | sed 's#//[^@]*@#//***@#')"
echo "PROBE: head=$(git rev-parse HEAD 2>&1) refs=$(git for-each-ref --format='%(refname)' 2>&1 | head -5 | tr '\n' ' ')"
echo "PROBE: env ref=$VERCEL_GIT_COMMIT_REF owner=$VERCEL_GIT_REPO_OWNER slug=$VERCEL_GIT_REPO_SLUG env=$VERCEL_ENV"
git fetch --unshallow origin 2>&1 | tail -2 | sed 's#//[^@]*@#//***@#'; echo "PROBE: after origin count=$(git rev-list --count HEAD 2>&1)"
git fetch --unshallow "https://github.com/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG.git" "$VERCEL_GIT_COMMIT_SHA" 2>&1 | tail -2; echo "PROBE: after url count=$(git rev-list --count HEAD 2>&1) shallow=$(git rev-parse --is-shallow-repository 2>&1)"
