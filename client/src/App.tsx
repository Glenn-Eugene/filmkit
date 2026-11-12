import {
useEffect,
useRef,
useState,
type PointerEvent as ReactPointerEvent,
type ReactNode,
} from "react";
import {
useMutation,
useQuery,
useQueryClient,
} from "@tanstack/react-query";
import {
Archive,
ArchiveRestore,
ArrowLeft,
ArrowDown,
ArrowUp,
AudioLines,
Bell,
BookOpen,
Box,
Camera,
Captions,
CaptionsOff,
Check,
ChevronDown,
ChevronLeft,
ChevronRight,
Clapperboard,
Copy,
Download,
Eye,
FileText,
Film,
Globe,
Heart,
Home,
ImagePlus,
LayoutGrid,
Library,
Link2,
Loader2,
MapPin,
Maximize2,
MessageSquare,
MonitorPlay,
MoreHorizontal,
Palette,
Pause,
Pencil,
PersonStanding,
Play,
Plus,
RotateCcw,
RotateCw,
Scissors,
ScrollText,
Search,
Send,
Sparkles,
Star,
StickyNote,
Trash2,
Trophy,
TriangleAlert,
Type,
Unlink,
Upload,
Users,
Video,
Volume2,
WandSparkles,
X,
ZoomIn,
ZoomOut,
} from "lucide-react";
import { fileToBase64 } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";
import heroUrl from "./assets/hero.jpg";

const STYLES = [
  "Noir",
  "Sci-Fi",
  "Western",
  "Anime",
  "Documentary",
  "Horror",
] as const;
type Style = (typeof STYLES)[number];

const EXAMPLES = [
  "A lighthouse keeper discovers the light is guiding something home",
  "The last video store on Earth gets a customer from the future",
  "A street musician in New Orleans hears a melody no one else can",
  "Two rival bakers in a small town fall for the same mysterious stranger",
];

type ProjectSummary = ApiResponse<
  typeof api,
  "listProjects"
>["projects"][number];
type ProjectData = ApiResponse<typeof api, "getProject">;
type Scene = ProjectData["scenes"][number];
type Character = ProjectData["characters"][number];
type FilmLocation = ProjectData["locations"][number];
type BibleDraft = ApiResponse<typeof api, "developBible">;
type CharacterDraft = BibleDraft["characters"][number];
type LocationDraft = BibleDraft["locations"][number];

// Canvas (Stage 4).
type CanvasData = ApiResponse<typeof api, "getCanvas">;
type CanvasSection = CanvasData["sections"][number];
type CanvasNode = CanvasData["nodes"][number];
type MediaItem = CanvasData["media"][number];
type CanvasLink = CanvasData["links"][number];
type ChatMsg = CanvasData["chat"][number];
type ChatProposal = {
  kind: "shotlist" | "bible" | "images";
  shots: { title: string; description: string; visualPrompt: string }[];
  characters: CharacterDraft[];
  locations: LocationDraft[];
  imagePrompts: string[];
};

function parseProposal(raw: string | null): ChatProposal | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ChatProposal>;
    if (
      p.kind !== "shotlist" &&
      p.kind !== "bible" &&
      p.kind !== "images"
    )
      return null;
    return {
      kind: p.kind,
      shots: p.shots ?? [],
      characters: p.characters ?? [],
      locations: p.locations ?? [],
      imagePrompts: p.imagePrompts ?? [],
    };
  } catch {
    return null;
  }
}

// Editor (Stage 5).
type EditData = ApiResponse<typeof api, "getEdit">;
type EditClip = EditData["clips"][number];
type EditText = EditData["texts"][number];
type EditAudio = EditData["audio"][number];
type EffectKey = EditClip["effect"];
type TransitionKey = EditClip["transition"];
type TextMotion = EditText["motion"];
type TextKind = EditText["kind"];

// Stage (Stage 6).
type StageData = ApiResponse<typeof api, "getStage">;
type StageSetup = StageData["setups"][number];
type StageItem = StageSetup["items"][number];
type ShotSize = "wide" | "medium" | "close";
type CamHeight = "low" | "eye" | "high" | "overhead";

// FilmKit TV (Stage 8).
type GalleryFilm = ApiResponse<typeof api, "listGallery">["films"][number];
type WorkflowData = ApiResponse<typeof api, "getWorkflow">;
const GALLERY_CATEGORIES = [
  "All",
  "Featured Workflows",
  "Series",
  "Animation",
  "Horror & Thriller",
  "True Stories",
  "Festival",
] as const;
type GalleryCategoryName = (typeof GALLERY_CATEGORIES)[number];
function formatRuntime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Stage 9: account, credits, plans, models.
type AccountData = ApiResponse<typeof api, "getAccount">["account"];
type ModelRow = AccountData["models"][number];
type PlanRow = AccountData["plans"][number];
function useAccount() {
  return useQuery({ queryKey: ["account"], queryFn: () => api.getAccount({}) });
}
function modelCostLabel(m: ModelRow): string {
  return m.costMax && m.costMax !== m.cost ? `${m.cost}–${m.costMax} credits` : `${m.cost} credits`;
}
const NOTIF_DEFS: { key: string; label: string; hint: string }[] = [
  { key: "likes", label: "Likes on my films", hint: "Someone likes a film you published to FilmKit TV." },
  { key: "supports", label: "Support & tips", hint: "Someone supports a film you published." },
  { key: "comments", label: "Comments", hint: "New comments on your films and workflows." },
  { key: "credits", label: "Credit grants & low balance", hint: "Monday/monthly grants land, and a warning before you run out." },
  { key: "festival", label: "Festival updates", hint: "Submission windows and shelf news for the FilmKit festival." },
  { key: "product", label: "Product news", hint: "New models, features, and plan changes." },
];

// Styles library (Stage 7).
type StyleRow = ApiResponse<typeof api, "listStyles">["styles"][number];
type StyleCategory = StyleRow["category"];
const STYLE_CATEGORIES: StyleCategory[] = [
  "Cinematic",
  "Cartoon",
  "Anime",
  "Drawing",
  "Illustration",
  "Painting",
  "3D",
];

type StudioFocus = "bible" | "script";
type View =
  | { name: "home" }
  | { name: "workspace" }
  | { name: "tv" }
  | { name: "library" }
  | { name: "account"; section: string }
  | { name: "studio"; projectId: number; focus?: StudioFocus }
  | {
      name: "watch";
      projectId: number;
      from: "home" | "workspace" | "tv" | "studio";
    };

export function App() {
  const [view, setView] = useState<View>({ name: "home" });
  const [publishOpen, setPublishOpen] = useState(false);

  const openStudio = (id: number, focus?: StudioFocus) =>
    setView({ name: "studio", projectId: id, focus });
  const goHome = () => setView({ name: "home" });
  const goWorkspace = () => setView({ name: "workspace" });
  const goTV = () => setView({ name: "tv" });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <GlobalNav
        current={view.name}
        onHome={goHome}
        onWorkspace={goWorkspace}
        onTV={goTV}
        onLibrary={() => setView({ name: "library" })}
        onOpenStudio={(id) => openStudio(id)}
        onPublish={() => setPublishOpen(true)}
        onAccount={(section) => setView({ name: "account", section })}
      />
      {view.name === "account" && (
        <AccountView
          section={view.section}
          onSection={(s) => setView({ name: "account", section: s })}
          onOpenStudio={openStudio}
        />
      )}
      {view.name === "home" && (
        <HomeView
          onOpenStudio={openStudio}
          onWatch={(id) =>
            setView({ name: "watch", projectId: id, from: "home" })
          }
          onWorkspace={goWorkspace}
          onTV={goTV}
        />
      )}
      {view.name === "workspace" && (
        <WorkspaceView
          onOpenStudio={(id) => openStudio(id)}
          onWatch={(id) =>
            setView({ name: "watch", projectId: id, from: "workspace" })
          }
        />
      )}
      {view.name === "tv" && (
        <TVView
          onWatch={(id) =>
            setView({ name: "watch", projectId: id, from: "tv" })
          }
          onOpenStudio={(id) => openStudio(id)}
        />
      )}
      {view.name === "library" && (
        <LibraryView onHome={goHome} onOpenStudio={openStudio} />
      )}
      {view.name === "studio" && (
        <StudioView
          projectId={view.projectId}
          focus={view.focus}
          onBack={goWorkspace}
          onWatch={(id) =>
            setView({ name: "watch", projectId: id, from: "studio" })
          }
        />
      )}
      {view.name === "watch" && (
        <WatchView
          projectId={view.projectId}
          onBack={() => {
            if (view.from === "studio")
              setView({ name: "studio", projectId: view.projectId });
            else if (view.from === "workspace") goWorkspace();
            else if (view.from === "tv") goTV();
            else goHome();
          }}
          onOpenStudio={(id) => openStudio(id)}
        />
      )}
      {/* Spacer so the mobile bottom bar never covers content. */}
      <div className="h-16 sm:hidden" aria-hidden />
      <MobileNav
        current={view.name}
        onHome={goHome}
        onWorkspace={goWorkspace}
        onTV={goTV}
        onLibrary={() => setView({ name: "library" })}
        onAccount={() => setView({ name: "account", section: "usage" })}
      />
      {publishOpen && (
        <PublishDialog onClose={() => setPublishOpen(false)} />
      )}
    </div>
  );
}

/* ------------------------------ Global shell ----------------------------- */

type NavTarget = "home" | "workspace" | "tv" | "library";

function GlobalNav({
  current,
  onHome,
  onWorkspace,
  onTV,
  onLibrary,
  onOpenStudio,
  onPublish,
  onAccount,
}: {
  current: View["name"];
  onHome: () => void;
  onWorkspace: () => void;
  onTV: () => void;
  onLibrary: () => void;
  onOpenStudio: (id: number) => void;
  onPublish: () => void;
  onAccount: (section: string) => void;
}) {
  const queryClient = useQueryClient();
  const accountQ = useAccount();
  const acct = accountQ.data?.account;
  const planName = acct?.plans.find((p) => p.id === acct.plan)?.name ?? "Free";
  const [openMenu, setOpenMenu] = useState<
    "bell" | "create" | "avatar" | null
  >(null);

  const newProject = useMutation({
    mutationFn: () => api.createBlankProject({}),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      setOpenMenu(null);
      onOpenStudio(data.projectId);
    },
  });

  const navItems: { key: NavTarget; label: string; go: () => void }[] = [
    { key: "home", label: "HOME", go: onHome },
    { key: "workspace", label: "WORKSPACE", go: onWorkspace },
    { key: "tv", label: "FILMKIT TV", go: onTV },
    { key: "library", label: "LIBRARY", go: onLibrary },
  ];
  const active = (key: NavTarget) =>
    current === key ||
    (key === "workspace" && current === "studio") ||
    (key === "tv" && current === "watch");

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 pt-safe backdrop-blur">
      {openMenu && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpenMenu(null)}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
        />
      )}
      <div className="relative z-50 mx-auto flex h-14 max-w-6xl items-center gap-1.5 px-3 sm:gap-3 sm:px-5">
        <button
          type="button"
          onClick={onHome}
          aria-label="FilmKit home"
          className="flex shrink-0 items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ink)] text-[#e8c476]">
            <Clapperboard className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="font-display hidden text-lg font-black min-[400px]:block">
            FilmKit
          </span>
        </button>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={active(item.key) ? "page" : undefined}
              onClick={item.go}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wider transition-colors ${
                active(item.key)
                  ? "bg-[var(--ink)] text-[#f6f3ec]"
                  : "text-[var(--dim)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onAccount("usage")}
            aria-label={acct ? `Credits: ${acct.balance} on the ${planName} plan. Open usage.` : "Credits and plan. Open usage."}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs min-[420px]:flex hover:border-[var(--accent)]"
            title="Your live credit balance — opens Usage"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
            <span className="font-semibold">{acct ? `${acct.balance.toLocaleString()} credits` : "… credits"}</span>
            <span className="text-[var(--dim)]">· {planName} plan</span>
          </button>

          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={openMenu === "bell"}
              onClick={() =>
                setOpenMenu(openMenu === "bell" ? null : "bell")
              }
              className="rounded-full border border-[var(--border)] p-2"
            >
              <Bell className="h-4.5 w-4.5" aria-hidden />
            </button>
            {openMenu === "bell" && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
                  Nothing yet. Likes, comments, and tips on your published
                  films will land here.
                </p>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Create"
              aria-expanded={openMenu === "create"}
              onClick={() =>
                setOpenMenu(openMenu === "create" ? null : "create")
              }
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              CREATE
            </button>
            {openMenu === "create" && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => newProject.mutate()}
                  disabled={newProject.isPending}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  {newProject.isPending ? "Creating…" : "New project"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    onPublish();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg)]"
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden />
                  Publish video
                </button>
                {newProject.isError && (
                  <p className="px-3 py-2 text-sm text-red-700">
                    The project didn't start. Try again.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-expanded={openMenu === "avatar"}
              onClick={() =>
                setOpenMenu(openMenu === "avatar" ? null : "avatar")
              }
              className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-base font-bold text-white"
            >
              {(acct?.displayName ?? "Y").slice(0, 1).toUpperCase()}
            </button>
            {openMenu === "avatar" && (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
                <p className="text-sm font-semibold">{acct?.displayName ?? "You"} · {planName} plan</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
                  {acct ? `${acct.balance.toLocaleString()} credits in the tank. ` : ""}Workspace account — full sign-ups arrive at launch.
                </p>
                <button
                  type="button"
                  onClick={() => { setOpenMenu(null); onAccount("account"); }}
                  className="mt-3 w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[#f6f3ec]"
                >
                  Account center
                </button>
                <button
                  type="button"
                  onClick={() => { setOpenMenu(null); onAccount("billing"); }}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
                >
                  Billing &amp; plans
                </button>
                <button
                  type="button"
                  onClick={() => { setOpenMenu(null); onWorkspace(); }}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
                >
                  Open workspace
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileNav({
  current,
  onHome,
  onWorkspace,
  onTV,
  onLibrary,
  onAccount,
}: {
  current: View["name"];
  onHome: () => void;
  onWorkspace: () => void;
  onTV: () => void;
  onLibrary: () => void;
  onAccount: () => void;
}) {
  const items: {
    key: string;
    label: string;
    icon: typeof Home;
    go: () => void;
    isActive: boolean;
  }[] = [
    { key: "home", label: "Home", icon: Home, go: onHome, isActive: current === "home" },
    {
      key: "workspace",
      label: "Workspace",
      icon: LayoutGrid,
      go: onWorkspace,
      isActive: current === "workspace" || current === "studio",
    },
    {
      key: "tv",
      label: "FilmKit TV",
      icon: MonitorPlay,
      go: onTV,
      isActive: current === "tv" || current === "watch",
    },
    {
      key: "library",
      label: "Library",
      icon: Library,
      go: onLibrary,
      isActive: current === "library",
    },
    {
      key: "account",
      label: "Account",
      icon: Users,
      go: onAccount,
      isActive: current === "account",
    },
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] pb-safe sm:hidden"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={item.isActive ? "page" : undefined}
            onClick={item.go}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              item.isActive ? "text-[var(--accent)]" : "text-[var(--dim)]"
            }`}
          >
            <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ------------------------- Stage 9 components -------------------------- */

function BibleCostNote({ projectId }: { projectId: number }) {
  const acctQ = useAccount();
  const projQ = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject({ projectId }) });
  const m = acctQ.data?.account.models.find((x) => x.id === projQ.data?.project.imageModel);
  if (!m) return null;
  return (
    <p className="mt-1 text-xs text-[var(--dim)]">
      Portraits and establishing views generate with {m.name} · {m.cost} credits each{m.locked ? ` · Locked — ${m.lockReason}` : ""}. Develop (text AI) is included at 0 credits.
    </p>
  );
}

function ProjectModelPickers({ project, account, onChanged }: { project: ProjectSummary; account: AccountData; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const setModels = useMutation({
    mutationFn: (args: { imageModel?: string; videoModel?: string }) => api.setProjectModels({ projectId: project.id, ...args }),
    onSuccess: () => { setErr(null); onChanged(); },
    onError: (e) => setErr(e instanceof Error ? e.message : "That model pick didn't save."),
  });
  const images = account.models.filter((m) => m.type === "image");
  const videos = account.models.filter((m) => m.type === "video");
  const imgSel = images.find((m) => m.id === project.imageModel);
  const vidSel = videos.find((m) => m.id === project.videoModel);
  const gated = account.plan === "free" || account.plan === "casual";
  return (
    <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Models for this film
        <span className="ml-auto normal-case tracking-normal">Balance: {account.balance.toLocaleString()} credits · {account.plans.find((p) => p.id === account.plan)?.name} plan</span>
      </p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pick-image-model" className="text-xs font-medium text-[var(--dim)]">Image model — scenes, portraits, canvas stills</label>
          <select id="pick-image-model" value={project.imageModel} disabled={setModels.isPending}
            onChange={(e) => setModels.mutate({ imageModel: e.target.value })}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
            {images.map((m) => (
              <option key={m.id} value={m.id} disabled={m.locked}>
                {m.name} · {modelCostLabel(m)}{m.locked ? ` · Locked — ${m.lockReason}` : ""}{m.fulfillment === "builtin" ? " · Built-in" : ""}
              </option>
            ))}
          </select>
          {imgSel && <p className="mt-1 text-[11px] leading-relaxed text-[var(--dim)]">{imgSel.fulfillment === "builtin" ? "Fulfilled by FilmKit's built-in engine." : "Aggregator model — fulfilled by your saved aggregator key."} {imgSel.note}</p>}
        </div>
        <div>
          <label htmlFor="pick-video-model" className="text-xs font-medium text-[var(--dim)]">Video model — motion clips (Frame to Clip)</label>
          <select id="pick-video-model" value={project.videoModel} disabled={setModels.isPending}
            onChange={(e) => setModels.mutate({ videoModel: e.target.value })}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
            {videos.map((m) => (
              <option key={m.id} value={m.id} disabled={m.locked}>
                {m.name} · {modelCostLabel(m)}{m.locked ? ` · Locked — ${m.lockReason}` : ""}{m.fulfillment === "builtin" ? " · Built-in (motion clip)" : ""}
              </option>
            ))}
          </select>
          {vidSel && <p className="mt-1 text-[11px] leading-relaxed text-[var(--dim)]">{vidSel.fulfillment === "builtin" ? "Budget model — fulfilled as a motion clip (pan/zoom over the start frame) by the built-in engine." : "Aggregator model — fulfilled by your saved aggregator key."} {vidSel.note}</p>}
        </div>
      </div>
      <p className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-medium">Character reference {gated ? "· Standard plan or higher" : "· Included"}</span>
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-medium">Multi-reference video {gated ? "· Standard plan or higher" : "· Included"}</span>
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-medium">Motion control {gated ? "· Standard plan or higher" : "· Included"}</span>
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-medium">Character dialogue {gated ? "· Standard plan or higher" : "· Included"}</span>
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 font-medium">{gated ? "Watermark on Free/Casual playback" : "No watermark on this plan"}</span>
      </p>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      {setModels.isPending && <p className="mt-1 text-xs text-[var(--dim)]">Saving model pick…</p>}
      <span className="hidden">{String(queryClient.isFetching({ queryKey: ["account"] }) > 0)}</span>
    </div>
  );
}

const ACCOUNT_SECTIONS: { id: string; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "usage", label: "Usage & credits" },
  { id: "billing", label: "Billing & plans" },
  { id: "models", label: "Model catalog" },
  { id: "preferences", label: "Preferences" },
  { id: "notifications", label: "Notifications" },
  { id: "team", label: "Team" },
  { id: "integrations", label: "Integrations" },
  { id: "help", label: "Help" },
];

function AccountView({ section, onSection, onOpenStudio }: { section: string; onSection: (s: string) => void; onOpenStudio: (id: number) => void }) {
  const queryClient = useQueryClient();
  const acctQ = useAccount();
  const acct = acctQ.data?.account;
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["account"] });
  const [period, setPeriod] = useState<"annual" | "monthly">("annual");
  useEffect(() => { if (acct) setPeriod(acct.billingPeriod === "monthly" ? "monthly" : "annual"); }, [acct?.billingPeriod]); // eslint-disable-line react-hooks/exhaustive-deps
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => { if (acct) { setName(acct.displayName); setBio(acct.bio); } }, [acct?.displayName, acct?.bio]); // eslint-disable-line react-hooks/exhaustive-deps
  const [modelFilter, setModelFilter] = useState<"all" | "image" | "video" | "audio">("all");
  const [provider, setProvider] = useState<"fal" | "replicate">("fal");
  const [apiKey, setApiKey] = useState("");
  useEffect(() => { if (acct) setProvider(acct.aggProvider === "replicate" ? "replicate" : "fal"); }, [acct?.aggProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const profile = useMutation({ mutationFn: () => api.updateAccountProfile({ displayName: name.trim(), bio }), onSuccess: invalidate });
  const prefs = useMutation({ mutationFn: (args: Parameters<typeof api.updatePreferences>[0]) => api.updatePreferences(args), onSuccess: invalidate });
  const notifs = useMutation({ mutationFn: (n: Record<string, boolean>) => api.updateNotifications({ notifications: n }), onSuccess: invalidate });
  const switchPlan = useMutation({ mutationFn: (plan: string) => api.switchPlan({ plan: plan as "free" | "casual" | "standard" | "pro" | "studio", billingPeriod: period }), onSuccess: () => { invalidate(); void queryClient.invalidateQueries({ queryKey: ["projects"] }); } });
  const saveKey = useMutation({ mutationFn: () => api.saveAggregatorKey({ provider, apiKey: apiKey.trim() }), onSuccess: () => { setApiKey(""); invalidate(); } });
  const clearKey = useMutation({ mutationFn: () => api.clearAggregatorKey({}), onSuccess: invalidate });

  const planName = acct?.plans.find((p) => p.id === acct.plan)?.name ?? "Free";
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  void onOpenStudio;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-5">
      <h1 className="font-display text-3xl font-black">Account center</h1>
      <p className="mt-1 text-sm text-[var(--dim)]">Workspace account — full sign-ups arrive at launch. Everything here is live and saved.</p>
      <div className="mt-5 flex flex-col gap-5 md:flex-row">
        <nav aria-label="Account sections" className="flex shrink-0 gap-1.5 overflow-x-auto md:w-48 md:flex-col md:overflow-visible">
          {ACCOUNT_SECTIONS.map((s) => (
            <button key={s.id} type="button" aria-current={section === s.id ? "page" : undefined} onClick={() => onSection(s.id)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-left text-sm font-medium ${section === s.id ? "bg-[var(--ink)] text-[#f6f3ec]" : "border border-[var(--border)] bg-[var(--surface)] md:border-0 md:bg-transparent hover:bg-[var(--surface)]"}`}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {acctQ.isPending && <p className="flex items-center gap-2 text-sm text-[var(--dim)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your account…</p>}
          {acctQ.isError && <p className="text-sm text-red-700">Your account couldn't be loaded. Try again in a moment.</p>}
          {acct && section === "account" && (
            <section aria-label="Account profile" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-3">
                <span className="font-display flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-xl font-bold text-white">{acct.displayName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <p className="font-semibold">{acct.displayName}</p>
                  <p className="text-sm text-[var(--dim)]">{planName} plan · {acct.balance.toLocaleString()} credits</p>
                </div>
              </div>
              <label htmlFor="acct-name" className="mt-5 block text-sm font-medium">Display name</label>
              <input id="acct-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none" />
              <label htmlFor="acct-bio" className="mt-3 block text-sm font-medium">Bio</label>
              <textarea id="acct-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} placeholder="Filmmaker, dreamer, keeper of lighthouses…" className="mt-1 w-full max-w-md resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none" />
              <button type="button" onClick={() => profile.mutate()} disabled={profile.isPending || !name.trim()} className="mt-3 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40">
                {profile.isPending ? "Saving…" : "Save profile"}
              </button>
              {profile.isSuccess && <span className="ml-2 text-sm text-[var(--dim)]">Saved.</span>}
              {profile.isError && <p className="mt-2 text-sm text-red-700">That didn't save. Try again.</p>}
              <p className="mt-5 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--dim)]">
                Sign-in: this build runs as one workspace account — full sign-ups arrive at launch. Your films, Bible, credits, and settings all live in this workspace.
              </p>
            </section>
          )}

          {acct && section === "usage" && (
            <section aria-label="Usage and credits" className="space-y-4">
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm text-[var(--dim)]">Credit balance · {planName} plan</p>
                <p className="font-display mt-1 text-4xl font-black">{acct.balance.toLocaleString()} <span className="text-lg font-bold text-[var(--dim)]">credits</span></p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
                  Cycle: {fmtDate(acct.cycleStart)} → {fmtDate(acct.cycleEnd)}. Plan credits do not roll over — the remainder expires when a new cycle starts.
                  {acct.plan === "free" ? " Free plan: +100 credits land every Monday and expire 7 days later." : " Earn more: your plan grant lands at the start of each cycle; top-ups are $1.50 per 100 credits on paid plans (see Billing)."}
                  {" "}Text AI — storyboard, script writing, Bible develop, canvas chat — is included at 0 credits. Failed generations refund automatically.
                </p>
                <button type="button" onClick={() => onSection("billing")} className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">See plans &amp; top-ups</button>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="font-display text-xl font-bold">Credit ledger</h2>
                {acct.ledger.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--dim)]">No credit activity yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--border)]">
                    {acct.ledger.map((e) => (
                      <li key={e.id} className="flex items-baseline gap-3 py-2.5 text-sm">
                        <span className={`w-16 shrink-0 font-semibold ${e.amount > 0 ? "text-green-700" : "text-red-700"}`}>{e.amount > 0 ? `+${e.amount.toLocaleString()}` : e.amount.toLocaleString()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{e.reason}</span>
                          {e.modelName && <span className="text-[var(--dim)]"> · {e.modelName}</span>}
                          <span className="block text-xs capitalize text-[var(--dim)]">{e.kind} · balance after: {e.balanceAfter.toLocaleString()}</span>
                        </span>
                        <span className="shrink-0 text-xs text-[var(--dim)]">{new Date(e.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}

          {acct && section === "billing" && (
            <section aria-label="Billing and plans" className="space-y-4">
              <p className="rounded-lg border border-[var(--accent)]/50 bg-[#e8c476]/15 px-4 py-3 text-sm leading-relaxed">
                Payments aren't connected yet. Prices are the launch prices, matching Flick's; plan switching is live so every tier can be exercised, and no card is charged.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium">Billing period</p>
                <div role="group" aria-label="Billing period" className="flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
                  {(["annual", "monthly"] as const).map((p) => (
                    <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize ${period === p ? "bg-[var(--ink)] text-[#f6f3ec]" : "text-[var(--dim)]"}`}>
                      {p}{p === "annual" ? " · save ~20%" : ""}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-[var(--dim)]">Current: {planName} ({acct.billingPeriod})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {acct.plans.map((p) => {
                  const price = period === "annual" ? p.annual : p.monthly;
                  const current = acct.plan === p.id;
                  return (
                    <div key={p.id} className={`rounded-[var(--radius)] border bg-[var(--surface)] p-4 ${current ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)]"}`}>
                      <p className="flex items-baseline justify-between"><span className="font-display text-lg font-bold">{p.name}</span>{current && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold text-white">Current plan</span>}</p>
                      {price === null ? (
                        <p className="mt-1 text-sm text-[var(--dim)]">Custom pricing — Contact sales</p>
                      ) : (
                        <p className="mt-1"><span className="font-display text-3xl font-black">${price}</span><span className="text-sm text-[var(--dim)]">/mo{period === "annual" && price > 0 ? " billed yearly" : ""}</span></p>
                      )}
                      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--dim)]">
                        <li>{p.creditsNote}</li>
                        <li>{p.gens}</li>
                        <li>{p.video}</li>
                        {(p.id === "standard" || p.id === "pro" || p.id === "studio") && <li>Character reference · multi-reference video · motion control · character dialogue · no watermark</li>}
                        {(p.id === "casual" || p.id === "standard" || p.id === "pro" || p.id === "studio") && <li>Team members included</li>}
                        {p.id === "pro" && <li>Priority support</li>}
                      </ul>
                      {p.id === "enterprise" ? (
                        <p className="mt-3 text-sm font-medium text-[var(--dim)]">Contact sales</p>
                      ) : (
                        <button type="button" disabled={current || switchPlan.isPending} onClick={() => switchPlan.mutate(p.id)}
                          className="mt-3 w-full rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40">
                          {current ? "Current plan" : switchPlan.isPending ? "Switching…" : `Switch to ${p.name}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {switchPlan.isError && <p className="text-sm text-red-700">{switchPlan.error instanceof Error ? switchPlan.error.message : "That switch didn't go through. Try again."}</p>}
              {switchPlan.isSuccess && <p className="text-sm text-[var(--dim)]">Plan switched — the old cycle's credits expired and the new plan's credits were granted. See Usage for the ledger.</p>}
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="font-display text-xl font-bold">Top up credits</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">$1.50 per 100 credits on paid plans. Top-ups land on top of your plan grant.</p>
                <button type="button" disabled className="mt-3 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] opacity-40" title="Payments aren't connected yet">
                  Buy 100 credits · $1.50 — payments not connected yet
                </button>
              </div>
              <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="px-4 pt-4 text-left font-display text-xl font-bold">Compare plans</caption>
                  <thead><tr className="border-b border-[var(--border)] text-[var(--dim)]"><th className="px-4 py-3 font-medium">Feature</th>{acct.plans.filter((p) => p.id !== "enterprise").map((p) => <th key={p.id} className="px-3 py-3 font-medium">{p.name}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {[
                      ["Credits / month", "100", "500", "2,500", "8,000", "24,000 (to 240,000)"],
                      ["Image models", "All plans", "All plans", "All plans", "All plans", "All plans"],
                      ["Video models", "Budget 6 only", "Budget 6 only", "Full catalog", "Full catalog", "Full catalog"],
                      ["Audio models", "All plans", "All plans", "All plans", "All plans", "All plans"],
                      ["Character reference", "—", "—", "Yes", "Yes", "Yes"],
                      ["Multi-reference video", "—", "—", "Yes", "Yes", "Yes"],
                      ["Motion control", "—", "—", "Yes", "Yes", "Yes"],
                      ["Character dialogue", "—", "—", "Yes", "Yes", "Yes"],
                      ["No watermark", "—", "—", "Yes", "Yes", "Yes"],
                      ["Team members", "—", "Yes", "Yes", "Yes", "Yes"],
                      ["Priority support", "—", "—", "—", "Yes", "Yes"],
                    ].map((row) => (
                      <tr key={row[0]}><th className="px-4 py-2.5 font-medium">{row[0]}</th>{row.slice(1).map((c, i) => <td key={i} className="px-3 py-2.5 text-[var(--dim)]">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
                <h2 className="font-display text-xl font-bold">Payment history</h2>
                <p className="mt-1 text-sm text-[var(--dim)]">No invoices yet — payments aren't connected, so nothing has ever been charged.</p>
              </div>
            </section>
          )}

          {acct && section === "models" && (
            <section aria-label="Model catalog" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Model catalog</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
                {acct.models.length} models: {acct.models.filter((m) => m.type === "image").length} image (including FilmKit Standard, the built-in entry), {acct.models.filter((m) => m.type === "video").length} video, {acct.models.filter((m) => m.type === "audio").length} audio.
                Built-in models are fulfilled by FilmKit's own engine — the standard image model for stills, and the 6 budget video models as motion clips. Everything else is an aggregator model: it unlocks when an aggregator key is saved in Integrations (and, for full video, on Standard or higher). Costs are per run; ranges show Flick's observed spread and the low end is what's charged.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter models by type">
                {(["all", "image", "video", "audio"] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={modelFilter === f} onClick={() => setModelFilter(f)} className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${modelFilter === f ? "bg-[var(--ink)] text-[#f6f3ec]" : "border border-[var(--border)]"}`}>{f}</button>
                ))}
              </div>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {acct.models.filter((m) => modelFilter === "all" || m.type === modelFilter).map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px] font-medium capitalize">{m.type}</span>
                    <span className="text-[var(--dim)]">{modelCostLabel(m)} / run</span>
                    <span className="text-[var(--dim)]">{m.fulfillment === "builtin" ? "Built-in engine" : "Aggregator"}</span>
                    {m.locked ? <span className="font-medium text-red-700">Locked — {m.lockReason}</span> : <span className="font-medium text-green-700">Available</span>}
                    {m.note && <span className="w-full text-xs text-[var(--dim)]">{m.note}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {acct && section === "preferences" && (
            <section aria-label="Preferences" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Preferences</h2>
              <label htmlFor="pref-chat" className="mt-4 block text-sm font-medium">Canvas chat approval default</label>
              <select id="pref-chat" value={acct.chatDefault} onChange={(e) => prefs.mutate({ chatDefault: e.target.value as "ask" | "auto" })} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
                <option value="ask">Ask — proposals wait for my approval</option>
                <option value="auto">Auto — image proposals run right away</option>
              </select>
              <p className="mt-1 text-xs text-[var(--dim)]">The starting mode for the canvas assistant on projects. Each project keeps its own toggle on the canvas.</p>
              <label htmlFor="pref-watermark" className="mt-4 block text-sm font-medium">Watermark position (Free/Casual playback)</label>
              <select id="pref-watermark" value={acct.watermarkPos} onChange={(e) => prefs.mutate({ watermarkPos: e.target.value as "top-left" | "top-right" })} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
              <label htmlFor="pref-theme" className="mt-4 block text-sm font-medium">Theme</label>
              <select id="pref-theme" value={acct.theme} onChange={(e) => prefs.mutate({ theme: e.target.value as "system" | "light" | "dark" })} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p className="mt-1 text-xs text-[var(--dim)]">Saved as your preference; FilmKit's studio keeps its paper-and-ink look in this build.</p>
              <label htmlFor="pref-rules" className="mt-4 block text-sm font-medium">Workflow rules</label>
              <textarea id="pref-rules" defaultValue={acct.workflowRules} key={acct.workflowRules} rows={4} maxLength={1000} placeholder="e.g. Always open on the lighthouse. Keep dialogue sparse. Never use the Horror style." className="mt-1 w-full max-w-xl resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
                onBlur={(e) => { if (e.target.value !== acct.workflowRules) prefs.mutate({ workflowRules: e.target.value }); }} />
              <p className="mt-1 text-xs text-[var(--dim)]">Standing instructions handed to the canvas chat agent as part of its context on every project. Saved when you click away.</p>
              {prefs.isPending && <p className="mt-2 text-xs text-[var(--dim)]">Saving…</p>}
              {prefs.isError && <p className="mt-2 text-sm text-red-700">That preference didn't save. Try again.</p>}
            </section>
          )}

          {acct && section === "notifications" && (
            <section aria-label="Notifications" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Notifications</h2>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {NOTIF_DEFS.map((d) => {
                  const on = acct.notifications[d.key] ?? true;
                  return (
                    <li key={d.key} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="text-xs leading-relaxed text-[var(--dim)]">{d.hint}</p>
                      </div>
                      <button type="button" role="switch" aria-checked={on} aria-label={d.label} disabled={notifs.isPending}
                        onClick={() => notifs.mutate({ ...acct.notifications, [d.key]: !on })}
                        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${on ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}>
                        <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {notifs.isError && <p className="text-sm text-red-700">That toggle didn't save. Try again.</p>}
            </section>
          )}

          {acct && section === "team" && (
            <section aria-label="Team" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Team</h2>
              <p className="mt-1 text-sm text-[var(--dim)]">{acct.plan === "free" ? "Team members arrive with any paid plan." : "Your plan includes team members."} 1 member today — you.</p>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                <li className="flex items-center gap-3 py-3">
                  <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">{acct.displayName.slice(0, 1).toUpperCase()}</span>
                  <div className="flex-1"><p className="text-sm font-medium">{acct.displayName}</p><p className="text-xs text-[var(--dim)]">Owner · {planName} plan</p></div>
                  <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium">Owner</span>
                </li>
              </ul>
              <label htmlFor="team-invite" className="mt-4 block text-sm font-medium">Invite by email</label>
              <div className="mt-1 flex max-w-md gap-2">
                <input id="team-invite" type="email" disabled placeholder="teammate@example.com" className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm opacity-60" />
                <button type="button" disabled className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] opacity-40">Invite</button>
              </div>
              <p className="mt-1 text-xs text-[var(--dim)]">Invites open with full accounts at launch — nobody can be invited into this workspace build yet.</p>
            </section>
          )}

          {acct && section === "integrations" && (
            <section aria-label="Integrations" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Integrations</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
                Aggregator models (everything beyond the built-in engine) run through your own aggregator account. Save a key and those models unlock in the pickers, subject to plan gates. Generation attempts route to the provider; a provider failure surfaces a clear error and refunds the credits automatically.
              </p>
              <p className="mt-3 text-sm">Status: <span className="font-semibold">{acct.hasKey ? `Key saved (${acct.aggProvider === "fal" ? "fal.ai" : "Replicate"})` : "No key"}</span></p>
              <label htmlFor="agg-provider" className="mt-4 block text-sm font-medium">Provider</label>
              <select id="agg-provider" value={provider} onChange={(e) => setProvider(e.target.value as "fal" | "replicate")} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none">
                <option value="fal">fal.ai</option>
                <option value="replicate">Replicate</option>
              </select>
              <label htmlFor="agg-key" className="mt-3 block text-sm font-medium">API key</label>
              <input id="agg-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" placeholder={acct.hasKey ? "Saved — type a new key to replace it" : "Paste your provider API key"} className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none" />
              <p className="mt-1 text-xs text-[var(--dim)]">Write-only: the key is saved on the server and never shown or sent back to this page. The page only ever knows "Key saved / No key".</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => saveKey.mutate()} disabled={saveKey.isPending || apiKey.trim().length < 4} className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40">
                  {saveKey.isPending ? "Saving…" : "Save key"}
                </button>
                {acct.hasKey && (
                  <button type="button" onClick={() => clearKey.mutate()} disabled={clearKey.isPending} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium disabled:opacity-40">
                    Remove key
                  </button>
                )}
              </div>
              {saveKey.isSuccess && <p className="mt-2 text-sm text-[var(--dim)]">Key saved — aggregator models are unlocked in the pickers (plan gates still apply).</p>}
              {saveKey.isError && <p className="mt-2 text-sm text-red-700">That key didn't save. Try again.</p>}
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <p className="text-sm font-medium">Also connected at launch</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">MCP: Flick-style connections for Claude / ChatGPT / Cursor are a launch item — not wired in this build, so there's nothing to toggle here yet.</p>
              </div>
            </section>
          )}

          {acct && section === "help" && (
            <section aria-label="Help" className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-display text-xl font-bold">Help</h2>
              <div className="mt-2 max-w-2xl space-y-3 text-sm leading-relaxed text-[var(--dim)]">
                <p><span className="font-medium text-[var(--text)]">How credits work.</span> Every media run shows its cost before you run it. The charge lands when the run succeeds; any failure — including an aggregator rejecting a key — refunds in full, and both entries appear in Usage → Credit ledger. Text AI (storyboards, scripts, Bible develop, canvas chat) is included at 0 credits.</p>
                <p><span className="font-medium text-[var(--text)]">Why is a model locked?</span> Two reasons, both shown on the model: "Needs aggregator key" (save one under Integrations) or a plan gate (full video and the reference/motion/dialogue features need Standard or higher). Built-in models — FilmKit Standard for stills and the 6 budget video models as motion clips — are never locked.</p>
                <p><span className="font-medium text-[var(--text)]">The Bible is FilmKit's edge.</span> Characters and locations are full profiles, not just reference pictures. Tag scenes and canvas nodes with them and their look, wardrobe, and place fold into every generation prompt — the exact prompt is shown on each scene and node.</p>
                <p><span className="font-medium text-[var(--text)]">Full feature inventory.</span> The complete FilmKit feature list — every stage, model, price, and gate — is documented as FEATURES.md in the FilmKit repository, and the Stage 9 notes there say exactly what still depends on a real aggregator key and connected payments.</p>
                <p><span className="font-medium text-[var(--text)]">Payments.</span> Payments aren't connected yet. Prices shown are the launch prices, matching Flick's; plan switching is live so every tier can be exercised, and no card is charged.</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });
  const publish = useMutation({
    mutationFn: (args: { projectId: number; published: boolean }) =>
      api.setProjectPublished(args),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const finished = (projects.data?.projects ?? []).filter(
    (p) =>
      !p.isSample && p.sceneCount > 0 && p.readyCount === p.sceneCount,
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Publish a film to FilmKit TV"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] bg-[var(--surface)] p-5 shadow-2xl"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-bold">
            Publish to FilmKit TV
          </h2>
          <button
            type="button"
            aria-label="Close publish dialog"
            onClick={onClose}
            className="ml-auto rounded-lg border border-[var(--border)] p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
          Finished films can premiere in the public gallery, badged as yours.
          Unpublish any time.
        </p>
        {projects.isPending && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--dim)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your films…
          </p>
        )}
        {projects.isSuccess && finished.length === 0 && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--dim)]">
            No finished films yet — a film is ready to publish once every
            scene is filmed in the studio.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {finished.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {p.title}
                </span>
                <span className="block text-xs text-[var(--dim)]">
                  {p.style} · {p.sceneCount} scenes
                  {p.published ? " · live on FilmKit TV" : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  publish.mutate({
                    projectId: p.id,
                    published: !p.published,
                  })
                }
                disabled={publish.isPending}
                className={`ml-auto shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold disabled:opacity-50 ${
                  p.published
                    ? "border border-[var(--border)]"
                    : "bg-[var(--accent)] text-white"
                }`}
              >
                {p.published ? "Unpublish" : "Publish"}
              </button>
            </li>
          ))}
        </ul>
        {publish.isError && (
          <p className="mt-3 text-sm text-red-700">
            That didn't go through. Only fully filmed films can be published —
            try again.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Home --------------------------------- */

const STYLE_BLURBS: Record<Style, string> = {
  Noir: "Shadow, smoke, and hard light",
  "Sci-Fi": "Sleek worlds and volumetric glow",
  Western: "Dust, gold light, wide horizons",
  Anime: "Hand-drawn warmth and painted skies",
  Documentary: "Real light, real people, no gloss",
  Horror: "Fog, stillness, and one harsh light",
};

function HomeView({
  onOpenStudio,
  onWatch,
  onWorkspace,
  onTV,
}: {
  onOpenStudio: (id: number, focus?: StudioFocus) => void;
  onWatch: (id: number) => void;
  onWorkspace: () => void;
  onTV: () => void;
}) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<Style>("Noir");
  // Styles library (Stage 7): a picked library style overrides the
  // built-in chips until cleared.
  const [libraryPick, setLibraryPick] = useState<StyleRow | null>(null);
  const [variants, setVariants] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });
  const libraryStyles = useQuery({
    queryKey: ["styles"],
    queryFn: () => api.listStyles({}),
  });
  const libraryList = libraryStyles.data?.styles ?? [];

  const pickBuiltin = (s: Style) => {
    setStyle(s);
    setLibraryPick(null);
  };
  const pickLibrary = (s: StyleRow) => {
    setLibraryPick(s);
    setStylePickerOpen(false);
    focusPrompt();
  };

  const create = useMutation({
    mutationFn: () =>
      api.createProject({
        prompt: prompt.trim(),
        style,
        ...(libraryPick ? { styleId: libraryPick.id } : {}),
        variants,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries();
      onOpenStudio(data.projectId);
    },
  });

  // Start anywhere: the blank-project entry paths create the project
  // immediately and land in the studio section the user asked for —
  // the script panel, the Bible (characters first, no story yet), or the
  // empty storyboard.
  const blank = useMutation({
    mutationFn: (kind: "canvas" | "script" | "bible") =>
      api.createBlankProject({
        style,
        ...(libraryPick ? { styleId: libraryPick.id } : {}),
      }),
    onSuccess: (data, kind) => {
      void queryClient.invalidateQueries();
      onOpenStudio(
        data.projectId,
        kind === "canvas" ? undefined : kind,
      );
    },
  });

  const focusPrompt = () => {
    promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    promptRef.current?.focus({ preventScroll: true });
  };

  const all = projects.data?.projects ?? [];
  const recent = all
    .filter((p) => !p.isSample && !p.archived)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const gallery = all.filter(
    (p) => p.readyCount > 0 && (p.isSample || p.published),
  );

  const entryPaths: {
    key: string;
    icon: typeof Sparkles;
    title: string;
    blurb: string;
    go: () => void;
    busy?: boolean;
  }[] = [
    {
      key: "script",
      icon: FileText,
      title: "Script to Film",
      blurb: "Start from a real script — import it in the Story view and plan the shots",
      go: () => blank.mutate("script"),
      busy: blank.isPending,
    },
    {
      key: "prompt",
      icon: Sparkles,
      title: "Prompt to Film",
      blurb: "One idea in, a full storyboard out",
      go: focusPrompt,
    },
    {
      key: "characters",
      icon: Users,
      title: "Build Characters",
      blurb: "Cast first — a fresh project, straight into the Bible, no story needed yet",
      go: () => blank.mutate("bible"),
      busy: blank.isPending,
    },
    {
      key: "style",
      icon: Palette,
      title: "Start from a style",
      blurb: "Pick the look first, then write the story into it",
      go: () => setStylePickerOpen((v) => !v),
    },
    {
      key: "blank",
      icon: Plus,
      title: "Blank canvas",
      blurb: "An empty project — add scenes one at a time, by hand",
      go: () => blank.mutate("canvas"),
      busy: blank.isPending,
    },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--ink)] text-[#f6f3ec]">
        <img
          src={heroUrl}
          alt="A lone traveler with a lantern crossing a misty mountain ridge at dusk"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />
        <div className="relative mx-auto max-w-3xl px-5 pt-safe pb-14 pt-16 sm:pt-24">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#e8c476]">
            <Clapperboard className="h-4 w-4" aria-hidden />
            FilmKit
          </p>
          <h1 className="font-display mt-4 text-5xl font-black leading-[1.05] sm:text-6xl">
            You direct.
            <br />
            AI films it.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#ddd6c6]">
            Describe a story. FilmKit writes the storyboard, generates every
            scene, and plays it back as a short film — all in about a minute.
          </p>

          <div className="mt-8 flex items-center justify-end gap-2.5">
            <label
              htmlFor="workflow-variants"
              className="text-sm text-[#ddd6c6]"
            >
              Workflow variants
              <span className="text-[#b9b2a2]">
                {" "}
                — alternate takes, bolder staging
              </span>
            </label>
            <button
              id="workflow-variants"
              type="button"
              role="switch"
              aria-checked={variants}
              onClick={() => setVariants((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                variants ? "bg-[#e8c476]" : "bg-white/25"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  variants ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="mt-3 rounded-[var(--radius)] bg-black/45 p-4 backdrop-blur-sm sm:p-5">
            <label
              htmlFor="story-prompt"
              className="text-sm font-medium text-[#f6f3ec]"
            >
              What story do you want to create today?
            </label>
            <textarea
              id="story-prompt"
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="A lighthouse keeper discovers the light is guiding something home…"
              className="mt-2 w-full resize-none rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-base text-white placeholder:text-[#b9b2a2] focus:border-[#e8c476] focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Film style">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={libraryPick === null && style === s}
                  onClick={() => pickBuiltin(s)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    libraryPick === null && style === s
                      ? "bg-[#e8c476] text-[#171205]"
                      : "bg-white/10 text-[#f6f3ec] hover:bg-white/20"
                  }`}
                >
                  {s}
                </button>
              ))}
              <span className="ml-auto self-center rounded border border-white/25 px-2 py-1 text-xs tracking-widest text-[#ddd6c6]">
                16:9
              </span>
            </div>
            {libraryPick ? (
              <p className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-[#f6f3ec]">
                <Palette className="h-4 w-4 text-[#e8c476]" aria-hidden />
                Filming in the library style{" "}
                <strong>{libraryPick.name}</strong>
                <button
                  type="button"
                  onClick={() => setLibraryPick(null)}
                  className="rounded-full border border-white/30 px-2.5 py-0.5 text-xs font-semibold"
                >
                  Use a built-in style instead
                </button>
              </p>
            ) : (
              libraryList.length > 0 && (
                <div className="mt-2.5">
                  <label
                    htmlFor="home-library-style"
                    className="text-sm text-[#ddd6c6]"
                  >
                    …or pick a style from the Library
                  </label>
                  <select
                    id="home-library-style"
                    value=""
                    onChange={(e) => {
                      const picked = libraryList.find(
                        (s) => s.id === Number(e.target.value),
                      );
                      if (picked) setLibraryPick(picked);
                    }}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-[#e8c476] focus:outline-none sm:w-auto"
                  >
                    <option value="" className="text-black">
                      Choose a library style…
                    </option>
                    {libraryList.map((s) => (
                      <option key={s.id} value={s.id} className="text-black">
                        {s.name} — {s.category}
                        {s.isBuiltin ? "" : " (yours)"}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
            <button
              type="button"
              disabled={create.isPending || prompt.trim().length < 3}
              onClick={() => create.mutate()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e8c476] px-5 py-3 text-base font-semibold text-[#171205] transition-opacity disabled:opacity-40"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Writing your storyboard…
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" aria-hidden />
                  Create my film
                </>
              )}
            </button>
            {create.isPending && (
              <p className="mt-2 text-center text-xs text-[#b9b2a2]">
                The director is breaking your story into scenes — this takes
                about 20 seconds.
              </p>
            )}
            {create.isError && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-[#f0a35e]">
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
                The storyboard didn't come through. Try again in a moment.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#ddd6c6] hover:bg-white/10"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Entry paths */}
      <section className="mx-auto max-w-5xl px-5 pt-10">
        <h2 className="font-display text-2xl font-bold">Start a film</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {entryPaths.map((path) => (
            <button
              key={path.key}
              type="button"
              onClick={path.go}
              disabled={path.busy}
              aria-expanded={path.key === "style" ? stylePickerOpen : undefined}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left shadow-sm transition-colors hover:border-[var(--accent)] disabled:opacity-50"
            >
              <path.icon
                className="h-5 w-5 text-[var(--accent)]"
                aria-hidden
              />
              <span className="font-display mt-2 block text-base font-bold">
                {path.busy ? "Opening the studio…" : path.title}
              </span>
              <span className="mt-1 block text-sm leading-snug text-[var(--dim)]">
                {path.blurb}
              </span>
            </button>
          ))}
        </div>
        {blank.isError && (
          <p className="mt-3 text-sm text-red-700">
            The studio didn't open. Try that again.
          </p>
        )}
        {stylePickerOpen && (
          <div className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-semibold">
              Pick a style — the prompt box above takes it from there
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={libraryPick === null && style === s}
                  onClick={() => {
                    pickBuiltin(s);
                    setStylePickerOpen(false);
                    focusPrompt();
                  }}
                  className={`rounded-lg border px-3.5 py-2.5 text-left ${
                    libraryPick === null && style === s
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="block text-sm font-semibold">{s}</span>
                  <span className="block text-xs text-[var(--dim)]">
                    {STYLE_BLURBS[s]}
                  </span>
                </button>
              ))}
            </div>
            {libraryList.length > 0 && (
              <>
                <p className="mt-5 text-sm font-semibold">
                  From the styles library
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {libraryList.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={libraryPick?.id === s.id}
                      onClick={() => pickLibrary(s)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                        libraryPick?.id === s.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--border)] hover:border-[var(--accent)]"
                      }`}
                    >
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt=""
                          className="h-10 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-[var(--ink)]">
                          <Palette
                            className="h-4 w-4 text-[var(--ink-dim)]"
                            aria-hidden
                          />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {s.name}
                        </span>
                        <span className="block text-xs text-[var(--dim)]">
                          {s.category}
                          {s.isBuiltin ? "" : " · Yours"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Recent projects */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-display text-3xl font-bold">Recent projects</h2>
          <button
            type="button"
            onClick={onWorkspace}
            className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Open the workspace
          </button>
        </div>
        {projects.isPending && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--dim)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading your films…
          </p>
        )}
        {projects.isError && (
          <p className="mt-4 text-sm text-red-700">
            Your films couldn't load. Pull down to retry, or reopen FilmKit.
          </p>
        )}
        {projects.isSuccess && recent.length === 0 && (
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--dim)]">
            Nothing here yet. Type a story above — or pick a starting path —
            and your film will be waiting in the studio.
          </p>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => onOpenStudio(p.id)}
              onWatch={() => onWatch(p.id)}
              showStudioButton
            />
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-3xl font-bold">FilmKit TV</h2>
            <span className="text-sm text-[var(--dim)]">
              Sample films and the films you publish, ready to watch
            </span>
            <button
              type="button"
              onClick={onTV}
              className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Open FilmKit TV
            </button>
          </div>
          {projects.isSuccess && gallery.length === 0 && (
            <p className="mt-4 text-base text-[var(--dim)]">
              The gallery fills up as films premiere — finish a film, then
              publish it from + CREATE to see it here.
            </p>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={() => onWatch(p.id)}
                onWatch={() => onWatch(p.id)}
              />
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 py-10 text-sm text-[var(--dim)]">
        FilmKit — a pocket film studio. Stories in, short films out.
      </footer>
    </main>
  );
}

function ProjectCard({
  project,
  onOpen,
  onWatch,
  showStudioButton = false,
}: {
  project: ProjectSummary;
  onOpen: () => void;
  onWatch: () => void;
  // Recent Projects / Workspace cards carry a labeled "Open in Studio"
  // button so the studio is one obvious tap from anywhere.
  showStudioButton?: boolean;
}) {
  const done = project.sceneCount > 0 && project.readyCount === project.sceneCount;
  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${project.title}`}
        className="block w-full text-left"
      >
        <span className="relative block aspect-video w-full overflow-hidden bg-[var(--ink)]">
          {project.posterUrl ? (
            <img
              src={project.posterUrl}
              alt={`Opening frame of ${project.title}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#57534a]">
              <Film className="h-10 w-10" aria-hidden />
            </span>
          )}
          {project.isSample && (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#e8c476]">
              Sample
            </span>
          )}
          {!project.isSample && project.published && (
            <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#8fd18a]">
              Yours · on TV
            </span>
          )}
        </span>
        <span className="block px-4 pb-2 pt-3">
          <span className="font-display block truncate text-lg font-bold leading-snug">
            {project.title}
          </span>
          <span className="mt-1 block truncate text-sm text-[var(--dim)]">
            {project.prompt || "No story yet — start anywhere."}
          </span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--dim)]">
          {project.style}
        </span>
        <span className="text-xs text-[var(--dim)]">
          {project.sceneCount === 0
            ? "No scenes yet"
            : `${project.readyCount} of ${project.sceneCount} scenes filmed`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {project.readyCount > 0 && (
            <button
              type="button"
              onClick={onWatch}
              aria-label={`Watch ${project.title}`}
              className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-sm font-medium"
            >
              <Play className="h-4 w-4" aria-hidden />
              {done ? "Watch" : "Preview"}
            </button>
          )}
          {showStudioButton && (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Open ${project.title} in the studio`}
              className="flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-semibold text-[#f6f3ec]"
            >
              <Clapperboard className="h-4 w-4" aria-hidden />
              Open in Studio
            </button>
          )}
        </span>
      </div>
    </article>
  );
}

/* -------------------------------- Workspace ------------------------------- */

type WorkspaceTab = "all" | "in_progress" | "done" | "archived";

function WorkspaceView({
  onOpenStudio,
  onWatch,
}: {
  onOpenStudio: (id: number) => void;
  onWatch: (id: number) => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"edited" | "name">("edited");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });

  const mine = (projects.data?.projects ?? []).filter((p) => !p.isSample);
  const counts = {
    all: mine.filter((p) => !p.archived).length,
    in_progress: mine.filter(
      (p) => !p.archived && p.status === "in_progress",
    ).length,
    done: mine.filter((p) => !p.archived && p.status === "done").length,
    archived: mine.filter((p) => p.archived).length,
  };
  const q = search.trim().toLowerCase();
  const visible = mine
    .filter((p) => {
      if (tab === "archived") return p.archived;
      if (p.archived) return false;
      if (tab === "in_progress") return p.status === "in_progress";
      if (tab === "done") return p.status === "done";
      return true;
    })
    .filter(
      (p) =>
        q.length === 0 ||
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : b.updatedAt.localeCompare(a.updatedAt),
    );

  const tabs: { key: WorkspaceTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "in_progress", label: "In Progress" },
    { key: "done", label: "Done" },
    { key: "archived", label: "Archived" },
  ];

  const emptyCopy: Record<WorkspaceTab, string> = {
    all: "No projects yet. Start one from Home — a prompt, a script, your characters, or a blank canvas.",
    in_progress: "Nothing in progress here. Films you are still making will wait for you in this tab.",
    done: "No finished films yet. Mark a project Done from its card menu when the last scene is filmed.",
    archived: "Nothing archived. Archiving a project tucks it away here without deleting it.",
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="font-display text-4xl font-black">Workspace</h1>
      <p className="mt-1 text-base text-[var(--dim)]">
        All your films — pick up any of them, from wherever you left off.
      </p>

      <div
        className="mt-6 flex gap-1 overflow-x-auto"
        role="group"
        aria-label="Filter projects by status"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[var(--ink)] text-[#f6f3ec]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--dim)]"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]"
            aria-hidden
          />
          <label htmlFor="workspace-search" className="sr-only">
            Search projects by name
          </label>
          <input
            id="workspace-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm focus:outline-none"
          />
        </div>
        <label
          htmlFor="workspace-sort"
          className="text-sm text-[var(--dim)]"
        >
          Sort
        </label>
        <select
          id="workspace-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as "edited" | "name")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none"
        >
          <option value="edited">Last edited</option>
          <option value="name">Name</option>
        </select>
      </div>

      {projects.isPending && (
        <p className="mt-8 flex items-center gap-2 text-sm text-[var(--dim)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading your workspace…
        </p>
      )}
      {projects.isError && (
        <p className="mt-8 text-sm text-red-700">
          Your projects couldn't load. Reopen FilmKit to try again.
        </p>
      )}
      {projects.isSuccess && visible.length === 0 && (
        <p className="mt-8 max-w-lg text-base leading-relaxed text-[var(--dim)]">
          {q.length > 0
            ? `No projects match “${search.trim()}” in this tab.`
            : emptyCopy[tab]}
        </p>
      )}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <WorkspaceCard
            key={p.id}
            project={p}
            onOpenStudio={() => onOpenStudio(p.id)}
            onWatch={() => onWatch(p.id)}
          />
        ))}
      </div>
    </main>
  );
}

function WorkspaceCard({
  project,
  onOpenStudio,
  onWatch,
}: {
  project: ProjectSummary;
  onOpenStudio: () => void;
  onWatch: () => void;
}) {
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  const after = () => {
    invalidate();
    setMenuOpen(false);
  };
  const rename = useMutation({
    mutationFn: (t: string) =>
      api.renameProject({ projectId: project.id, title: t }),
    onSuccess: () => {
      setRenaming(false);
      after();
    },
  });
  const duplicate = useMutation({
    mutationFn: () => api.duplicateProject({ projectId: project.id }),
    onSuccess: after,
  });
  const setStatus = useMutation({
    mutationFn: (status: "in_progress" | "done") =>
      api.setProjectStatus({ projectId: project.id, status }),
    onSuccess: after,
  });
  const setArchived = useMutation({
    mutationFn: (archived: boolean) =>
      api.setProjectArchived({ projectId: project.id, archived }),
    onSuccess: after,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteProject({ projectId: project.id }),
    onSuccess: invalidate,
  });

  const menuItem =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--bg)] disabled:opacity-50";

  return (
    <div className="relative">
      <ProjectCard
        project={project}
        onOpen={onOpenStudio}
        onWatch={onWatch}
        showStudioButton
      />
      <div className="absolute right-2 top-2">
        <button
          type="button"
          aria-label={`Menu for ${project.title}`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full bg-black/70 p-2 text-white"
        >
          <MoreHorizontal className="h-4.5 w-4.5" aria-hidden />
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close project menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-transparent"
            />
            <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--text)] shadow-lg">
              {renaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (title.trim()) rename.mutate(title.trim());
                  }}
                  className="p-1.5"
                >
                  <label
                    htmlFor={`rename-${project.id}`}
                    className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
                  >
                    New name
                  </label>
                  <input
                    id={`rename-${project.id}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    autoFocus
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={rename.isPending || !title.trim()}
                      className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[#f6f3ec] disabled:opacity-50"
                    >
                      {rename.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(false);
                        setTitle(project.title);
                      }}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : confirmDelete ? (
                <div className="p-1.5">
                  <p className="text-sm">
                    Delete “{project.title}” for good?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => remove.mutate()}
                      disabled={remove.isPending}
                      className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {remove.isPending ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={menuItem}
                    onClick={() => {
                      setTitle(project.title);
                      setRenaming(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                    Rename
                  </button>
                  <button
                    type="button"
                    className={menuItem}
                    disabled={duplicate.isPending}
                    onClick={() => duplicate.mutate()}
                  >
                    <Copy className="h-4 w-4 shrink-0" aria-hidden />
                    {duplicate.isPending ? "Duplicating…" : "Duplicate"}
                  </button>
                  {project.status === "done" ? (
                    <button
                      type="button"
                      className={menuItem}
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate("in_progress")}
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
                      Mark In Progress
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={menuItem}
                      disabled={setStatus.isPending}
                      onClick={() => setStatus.mutate("done")}
                    >
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                      Mark Done
                    </button>
                  )}
                  {project.archived ? (
                    <button
                      type="button"
                      className={menuItem}
                      disabled={setArchived.isPending}
                      onClick={() => setArchived.mutate(false)}
                    >
                      <ArchiveRestore
                        className="h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      Unarchive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={menuItem}
                      disabled={setArchived.isPending}
                      onClick={() => setArchived.mutate(true)}
                    >
                      <Archive className="h-4 w-4 shrink-0" aria-hidden />
                      Archive
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${menuItem} text-red-700`}
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                    Delete
                  </button>
                </>
              )}
              {(rename.isError ||
                duplicate.isError ||
                setStatus.isError ||
                setArchived.isError ||
                remove.isError) && (
                <p className="px-3 py-2 text-sm text-red-700">
                  That didn't go through. Try again.
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <p className="mt-1.5 px-1 text-xs text-[var(--dim)]">
        {project.status === "done" ? "Done" : "In progress"}
        {project.archived ? " · Archived" : ""} · Last edited{" "}
        {new Date(project.updatedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

/* -------------------------------- FilmKit TV ------------------------------ */

function useGalleryActions(onOpenStudio: (id: number) => void) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["gallery"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  };
  const like = useMutation({
    mutationFn: (f: GalleryFilm) =>
      api.toggleGalleryLike({ projectId: f.id, liked: !f.liked }),
    onSuccess: invalidate,
  });
  const support = useMutation({
    mutationFn: (f: GalleryFilm) =>
      api.toggleGallerySupport({ projectId: f.id, supported: !f.supported }),
    onSuccess: invalidate,
  });
  const festival = useMutation({
    mutationFn: (f: GalleryFilm) =>
      api.setFestivalSubmitted({
        projectId: f.id,
        submitted: !f.festivalSubmitted,
      }),
    onSuccess: invalidate,
  });
  const remix = useMutation({
    mutationFn: (id: number) => api.remixWorkflow({ projectId: id }),
    onSuccess: (r) => {
      invalidate();
      onOpenStudio(r.projectId);
    },
  });
  return { like, support, festival, remix };
}

function WorkflowPanel({
  projectId,
  onOpenStudio,
  dark = false,
}: {
  projectId: number;
  onOpenStudio: (id: number) => void;
  dark?: boolean;
}) {
  const queryClient = useQueryClient();
  const wf = useQuery({
    queryKey: ["workflow", projectId],
    queryFn: () => api.getWorkflow({ projectId }),
  });
  const remix = useMutation({
    mutationFn: () => api.remixWorkflow({ projectId }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenStudio(r.projectId);
    },
  });
  const dim = dark ? "text-[#a49e90]" : "text-[var(--dim)]";
  const card = dark
    ? "rounded-[var(--radius)] border border-white/15 bg-white/5 p-5"
    : "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5";
  if (wf.isPending)
    return (
      <p className={`flex items-center gap-2 text-sm ${dim}`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the
        workflow…
      </p>
    );
  if (wf.isError || !wf.data)
    return <p className="text-sm text-red-600">This workflow couldn't be loaded.</p>;
  const d: WorkflowData = wf.data;
  return (
    <div className={card}>
      <h3 className="font-display text-2xl font-bold">How “{d.title}” was made</h3>
      <p className={`mt-1 text-sm ${dim}`}>
        By {d.creator}
        {d.isSample ? " · Sample film" : ""} · Style: {d.style}
      </p>
      <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide">Story prompt</h4>
      <p className="mt-1 text-base leading-relaxed">{d.prompt || "No prompt recorded — this film started from a blank canvas."}</p>
      <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide">Storyboard</h4>
      {d.scenes.length === 0 ? (
        <p className={`mt-1 text-sm ${dim}`}>No scenes on the storyboard yet.</p>
      ) : (
        <ol className="mt-2 space-y-3">
          {d.scenes.map((s, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium">{i + 1}. {s.title}</p>
              <p className={`mt-0.5 leading-relaxed ${dim}`}>{s.description}</p>
              <p className={`mt-0.5 leading-relaxed ${dim}`}><span className="font-medium">Visual prompt:</span> {s.visualPrompt}</p>
            </li>
          ))}
        </ol>
      )}
      <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide">Bible overview</h4>
      {d.characters.length === 0 && d.locations.length === 0 ? (
        <p className={`mt-1 text-sm ${dim}`}>This film has no Bible entries — no developed characters or locations were recorded for it.</p>
      ) : (
        <div className="mt-2 space-y-2 text-sm">
          {d.characters.map((c) => (
            <p key={c.name}><span className="font-medium">{c.name}</span> ({c.role}) — {c.line}</p>
          ))}
          {d.locations.map((l) => (
            <p key={l.name}><span className="font-medium">{l.name}</span> — {l.line}</p>
          ))}
        </div>
      )}
      <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide">Editor notes</h4>
      <p className={`mt-1 text-sm leading-relaxed ${dim}`}>{d.editorNote}</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => remix.mutate()}
          disabled={remix.isPending}
          aria-label={`Remix this workflow: copy ${d.title} into your Workspace`}
          className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {remix.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          Remix this workflow
        </button>
        <span className={`text-xs ${dim}`}>Copies the storyboard and Bible into your Workspace — stills are not copied, so you film your own version. The original is untouched.</span>
      </div>
      {remix.isError && <p className="mt-2 text-sm text-red-600">Remix didn't go through. Try again.</p>}
    </div>
  );
}

function GalleryFilmCard({
  film,
  onWatch,
  onWorkflow,
  actions,
}: {
  film: GalleryFilm;
  onWatch: (id: number) => void;
  onWorkflow: (id: number) => void;
  actions: ReturnType<typeof useGalleryActions>;
}) {
  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <button type="button" onClick={() => onWatch(film.id)} aria-label={`Watch ${film.title}`} className="block w-full text-left">
        <span className="relative block aspect-video w-full overflow-hidden bg-[var(--ink)]">
          {film.posterUrl ? (
            <img src={film.posterUrl} alt={`Opening frame of ${film.title}`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#57534a]"><Film className="h-10 w-10" aria-hidden /></span>
          )}
          {film.isSample && <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#e8c476]">Sample</span>}
          {!film.isSample && <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#8fd18a]">Yours</span>}
          {film.festivalSubmitted && <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">Festival</span>}
        </span>
        <span className="block px-4 pb-1 pt-3">
          <span className="font-display block truncate text-lg font-bold leading-snug">{film.title}</span>
          <span className="mt-0.5 block text-sm text-[var(--dim)]">by {film.creator} · {formatRuntime(film.runtimeSeconds)} · {film.style}</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-1">
        <button type="button" onClick={() => actions.like.mutate(film)} aria-label={`${film.liked ? "Unlike" : "Like"} ${film.title}`} aria-pressed={film.liked} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${film.liked ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"}`}>
          <Heart className={`h-4 w-4 ${film.liked ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} aria-hidden /> {film.likes}
        </button>
        <button type="button" onClick={() => actions.support.mutate(film)} aria-label={`${film.supported ? "Withdraw support for" : "Support"} ${film.title}`} aria-pressed={film.supported} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${film.supported ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)]"}`}>
          <Sparkles className="h-4 w-4" aria-hidden /> Support · {film.supports}
        </button>
        <button type="button" onClick={() => onWorkflow(film.id)} aria-label={`Get workflow for ${film.title}`} className="flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-semibold text-[#f6f3ec]">
          <ScrollText className="h-4 w-4" aria-hidden /> Get Workflow
        </button>
        <button type="button" onClick={() => onWatch(film.id)} aria-label={`Play ${film.title}`} className="ml-auto flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-sm font-medium">
          <Play className="h-4 w-4" aria-hidden /> Watch
        </button>
      </div>
      <p className="px-4 pb-3 text-xs leading-relaxed text-[var(--dim)]">
        Support is recorded in-app only — no money moves; tipping and payouts arrive with accounts at Stage 9.
      </p>
    </article>
  );
}

function TVView({
  onWatch,
  onOpenStudio,
}: {
  onWatch: (id: number) => void;
  onOpenStudio: (id: number) => void;
}) {
  const [category, setCategory] = useState<GalleryCategoryName>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recommended" | "liked" | "newest">("recommended");
  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const actions = useGalleryActions(onOpenStudio);
  const gallery = useQuery({ queryKey: ["gallery"], queryFn: () => api.listGallery({}) });
  const films = gallery.data?.films ?? [];
  // Editor's Choice: rotate daily through the featured (sample-led) films.
  const featuredPool = films.filter((f) => f.featured);
  const heroPool = featuredPool.length > 0 ? featuredPool : films;
  const hero = heroPool.length > 0 ? heroPool[Math.floor(Date.now() / 86400000) % heroPool.length] : undefined;
  const featuredRow = films.filter((f) => f.featured);
  const q = search.trim().toLowerCase();
  const inCategory = (f: GalleryFilm) =>
    category === "All" ? true : category === "Series" ? false : f.categories.includes(category);
  const visible = films
    .filter(inCategory)
    .filter((f) => !q || f.title.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === "liked" ? b.likes - a.likes || b.id - a.id : sort === "newest" ? b.id - a.id : a.id - b.id,
    );
  const emptyCopy: Record<string, string> = {
    Series: "No series on FilmKit TV yet. Multi-film sagas aren't part of FilmKit yet, so this shelf is honestly empty for now.",
    Festival: "No festival submissions yet. Open a published film, watch it, and choose “Submit to the festival” to place it on this shelf.",
    Animation: "No animated films are showing yet. Publish a film in an Anime or cartoon style and it lands here.",
    "Horror & Thriller": "No horror or thriller films are showing yet. Publish a Horror film and it lands here.",
    "True Stories": "No true-story films are showing yet. Publish a Documentary film and it lands here.",
    "Featured Workflows": "No featured workflows yet.",
  };
  if (workflowId !== null) {
    const film = films.find((f) => f.id === workflowId);
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <button type="button" onClick={() => setWorkflowId(null)} className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to FilmKit TV
        </button>
        <h1 className="font-display mt-6 text-4xl font-black">Get Workflow</h1>
        <p className="mt-1 text-base text-[var(--dim)]">How this film was made — read-only. Remix it to make your own version.</p>
        <div className="mt-6">
          <WorkflowPanel projectId={workflowId} onOpenStudio={onOpenStudio} />
        </div>
        {film && (
          <button type="button" onClick={() => onWatch(film.id)} aria-label={`Watch ${film.title}`} className="mt-4 flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[#f6f3ec]">
            <Play className="h-4 w-4" aria-hidden /> Watch {film.title}
          </button>
        )}
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-display text-4xl font-black">FilmKit TV</h1>
      <p className="mt-1 max-w-xl text-base leading-relaxed text-[var(--dim)]">
        The public gallery: labeled sample films, and your own films once you publish them from + CREATE.
      </p>
      {gallery.isPending && (
        <p className="mt-6 flex items-center gap-2 text-sm text-[var(--dim)]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading the gallery…</p>
      )}
      {gallery.isSuccess && films.length === 0 && (
        <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--dim)]">Nothing is showing yet. Finish a film in the studio and publish it — it premieres here, badged as yours.</p>
      )}
      {hero && category === "All" && !q && (
        <section aria-label="Editor's Choice" className="mt-8 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--ink)] text-[#f6f3ec]">
          <div className="grid sm:grid-cols-2">
            <button type="button" onClick={() => onWatch(hero.id)} aria-label={`Watch Editor's Choice: ${hero.title}`} className="relative block aspect-video w-full overflow-hidden sm:aspect-auto sm:min-h-64">
              {hero.posterUrl ? <img src={hero.posterUrl} alt={`Opening frame of ${hero.title}`} className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><Film className="h-12 w-12" aria-hidden /></span>}
            </button>
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8c476]">Editor's Choice</p>
              <h2 className="font-display mt-2 text-3xl font-black leading-tight">{hero.title}</h2>
              <p className="mt-2 text-sm text-[#a49e90]">by {hero.creator} · {formatRuntime(hero.runtimeSeconds)} · {hero.style}{hero.isSample ? " · Sample" : " · Yours"}</p>
              <p className="mt-3 line-clamp-3 text-base leading-relaxed text-[#d8d2c4]">{hero.prompt}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => onWatch(hero.id)} aria-label={`Watch ${hero.title}`} className="flex items-center gap-2 rounded-full bg-[#e8c476] px-4 py-2.5 text-sm font-semibold text-[#171205]"><Play className="h-4 w-4" aria-hidden /> Watch</button>
                <button type="button" onClick={() => setWorkflowId(hero.id)} aria-label={`Get workflow for ${hero.title}`} className="flex items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-medium"><ScrollText className="h-4 w-4" aria-hidden /> Get Workflow</button>
                <button type="button" onClick={() => actions.like.mutate(hero)} aria-label={`${hero.liked ? "Unlike" : "Like"} ${hero.title}`} aria-pressed={hero.liked} className="flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-2.5 text-sm font-medium"><Heart className={`h-4 w-4 ${hero.liked ? "fill-[#e8c476] text-[#e8c476]" : ""}`} aria-hidden /> {hero.likes}</button>
              </div>
            </div>
          </div>
        </section>
      )}
      {featuredRow.length > 0 && category === "All" && !q && (
        <section aria-label="Featured films" className="mt-10">
          <h2 className="font-display text-2xl font-bold">Featured</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRow.map((f) => <GalleryFilmCard key={f.id} film={f} onWatch={onWatch} onWorkflow={setWorkflowId} actions={actions} />)}
          </div>
        </section>
      )}
      <section aria-label="All films" className="mt-10">
        <h2 className="font-display text-2xl font-bold">{category === "All" ? "Community films" : category}</h2>
        {category === "Festival" && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">FilmKit's in-app festival shelf. Submitting places a published film here — prizes and judging are a future business step and are not promised in the app.</p>
        )}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]" aria-hidden />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search films by title…" aria-label="Search films by title" className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm focus:border-[var(--accent)] focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm"><span className="text-[var(--dim)]">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as "recommended" | "liked" | "newest")} aria-label="Sort films" className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none">
                <option value="recommended">Recommended</option><option value="liked">Most liked</option><option value="newest">Newest</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter films by category">
            {GALLERY_CATEGORIES.map((c) => (
              <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${category === c ? "bg-[var(--ink)] text-[#f6f3ec]" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--dim)]"}`}>{c}</button>
            ))}
          </div>
        </div>
        {gallery.isSuccess && visible.length === 0 && films.length > 0 && (
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--dim)]">{q ? `No films match “${search.trim()}” in this category.` : (emptyCopy[category] ?? "Nothing in this category yet.")}</p>
        )}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((f) => <GalleryFilmCard key={f.id} film={f} onWatch={onWatch} onWorkflow={setWorkflowId} actions={actions} />)}
        </div>
      </section>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
        Support is in-app only for now: it records your support here as a count — no money moves. Tipping and creator payouts arrive with accounts at Stage 9.
      </p>
    </main>
  );
}

/* --------------------------------- Library -------------------------------- */

/* ------------------------- Styles library (Stage 7) ---------------------- */
//
// The Library page: FilmKit's visual styles catalog (Flickpedia's spot).
// Browse / search / filter the seeded built-in styles plus the user's own,
// favorite them, apply one to a project, or create your own — a style is a
// real generation input: its prompt modifier steers every still a project
// generates. Image Inspo / Classic Film Scenes / Tutorials are later
// stages; SFX arrives with audio at Stage 9 (noted, not faked).

function LibraryView({
  onHome,
  onOpenStudio,
}: {
  onHome: () => void;
  onOpenStudio: (id: number, focus?: StudioFocus) => void;
}) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<"All" | StyleCategory>("All");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recommended" | "az">("recommended");
  const [formStyle, setFormStyle] = useState<StyleRow | "new" | null>(null);
  const [useStyle, setUseStyle] = useState<StyleRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StyleRow | null>(null);

  const stylesQuery = useQuery({
    queryKey: ["styles"],
    queryFn: () => api.listStyles({}),
  });
  const allStyles = stylesQuery.data?.styles ?? [];

  // First visit: seed the built-in catalog (idempotent server-side), and
  // keep seeding while any built-in thumbnail is still missing — one call
  // generates a capped batch, so the loop resumes it. Bounded attempts;
  // after that the "finish them now" button below takes over.
  const seed = useMutation({
    mutationFn: () => api.seedStyles({}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["styles"] });
    },
  });
  const seedAttempts = useRef(0);
  const seedPending = seed.isPending;
  useEffect(() => {
    if (!stylesQuery.isSuccess || seedPending) return;
    const needsSeed =
      allStyles.length === 0 ||
      allStyles.some((s) => s.isBuiltin && !s.imageUrl);
    if (needsSeed && seedAttempts.current < 10) {
      seedAttempts.current += 1;
      seed.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stylesQuery.isSuccess, allStyles, seedPending]);

  const invalidateStyles = () =>
    void queryClient.invalidateQueries({ queryKey: ["styles"] });

  const favorite = useMutation({
    mutationFn: (s: StyleRow) =>
      api.toggleStyleFavorite({ styleId: s.id, favorite: !s.favorite }),
    onSuccess: invalidateStyles,
  });
  const duplicate = useMutation({
    mutationFn: (s: StyleRow) => api.duplicateStyle({ styleId: s.id }),
    onSuccess: invalidateStyles,
  });
  const del = useMutation({
    mutationFn: (s: StyleRow) => api.deleteStyle({ styleId: s.id }),
    onSuccess: () => {
      setConfirmDelete(null);
      invalidateStyles();
    },
  });
  const regenThumb = useMutation({
    mutationFn: (s: StyleRow) => api.generateStyleThumbnail({ styleId: s.id }),
    onSuccess: invalidateStyles,
  });

  const q = search.trim().toLowerCase();
  const visible = allStyles
    .filter((s) => category === "All" || s.category === category)
    .filter((s) => !favoritesOnly || s.favorite)
    .filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    )
    .sort((a, b) =>
      sort === "az" ? a.name.localeCompare(b.name) : a.id - b.id,
    );
  const pendingThumbs = allStyles.filter(
    (s) => s.isBuiltin && !s.imageUrl,
  ).length;

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl font-black">Styles library</h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-[var(--dim)]">
            Every style here is a real look you can film in — pick one and it
            steers every still your project generates.{" "}
            {allStyles.length > 0 &&
              `${allStyles.length} styles and counting.`}{" "}
            Image inspiration, classic film scenes, and tutorials join the
            Library in a later stage; sound effects arrive with audio models.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormStyle("new")}
          className="flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[#f6f3ec]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create my style
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dim)]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search styles…"
              aria-label="Search styles by name or description"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--dim)]">Sort</span>
            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "recommended" | "az")
              }
              aria-label="Sort styles"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="az">A–Z</option>
            </select>
          </label>
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${
              favoritesOnly
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <Star
              className={`h-4 w-4 ${favoritesOnly ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`}
              aria-hidden
            />
            Favorites
          </button>
        </div>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by category"
        >
          {(["All", ...STYLE_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                category === c
                  ? "bg-[var(--ink)] text-[#f6f3ec]"
                  : "border border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {stylesQuery.isPending && (
        <p className="mt-10 flex items-center gap-2 text-sm text-[var(--dim)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading the library…
        </p>
      )}
      {stylesQuery.isError && (
        <p className="mt-10 flex items-center gap-1.5 text-sm text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          The library couldn't load.{" "}
          <button
            type="button"
            onClick={() => void stylesQuery.refetch()}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </p>
      )}
      {stylesQuery.isSuccess && allStyles.length === 0 && (
        <div className="mt-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          {seed.isPending ? (
            <p className="flex items-center justify-center gap-2 text-sm text-[var(--dim)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Setting up the styles library — generating each style's
              thumbnail in its own look. This takes a couple of minutes.
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--dim)]">
                The styles library hasn't been set up yet.
              </p>
              <button
                type="button"
                onClick={() => seed.mutate()}
                className="mt-3 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec]"
              >
                Set up the styles library
              </button>
              {seed.isError && (
                <p className="mt-2 text-sm text-red-700">
                  Setup hiccuped — try again.
                </p>
              )}
            </>
          )}
        </div>
      )}
      {seed.isSuccess && pendingThumbs > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[var(--dim)]">
          {pendingThumbs} thumbnail{pendingThumbs === 1 ? "" : "s"} still to
          generate.
          <button
            type="button"
            disabled={seed.isPending}
            onClick={() => seed.mutate()}
            className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline disabled:opacity-50"
          >
            {seed.isPending ? "Generating…" : "Finish them now"}
          </button>
        </p>
      )}

      {/* Grid */}
      {allStyles.length > 0 && visible.length === 0 && (
        <p className="mt-10 text-sm text-[var(--dim)]">
          No styles match that search.{" "}
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
              setFavoritesOnly(false);
            }}
            className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Clear the filters
          </button>
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <article
            key={s.id}
            className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm"
          >
            <div className="relative aspect-video bg-[var(--ink)]">
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt={`${s.name} style thumbnail`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                  <p className="text-sm text-[var(--ink-dim)]">
                    Thumbnail not generated yet
                  </p>
                  <button
                    type="button"
                    disabled={regenThumb.isPending}
                    onClick={() => regenThumb.mutate(s)}
                    className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-[#f6f3ec] disabled:opacity-50"
                  >
                    {regenThumb.isPending
                      ? "Generating…"
                      : "Generate thumbnail"}
                  </button>
                </div>
              )}
              <button
                type="button"
                aria-label={
                  s.favorite
                    ? `Remove ${s.name} from favorites`
                    : `Save ${s.name} to favorites`
                }
                aria-pressed={s.favorite}
                onClick={() => favorite.mutate(s)}
                className="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white backdrop-blur-sm"
              >
                <Star
                  className={`h-4 w-4 ${s.favorite ? "fill-[#e8c476] text-[#e8c476]" : ""}`}
                  aria-hidden
                />
              </button>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold leading-tight">
                  {s.name}
                </h2>
                <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs font-medium text-[var(--dim)]">
                  {s.category}
                </span>
                {!s.isBuiltin && (
                  <span className="rounded-full bg-[#e8c476]/25 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#7a5a12]">
                    Yours
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm leading-snug text-[var(--dim)]">
                {s.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setUseStyle(s)}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-semibold text-[#f6f3ec]"
                >
                  <Palette className="h-4 w-4" aria-hidden />
                  Use this style
                </button>
                <button
                  type="button"
                  onClick={() => duplicate.mutate(s)}
                  disabled={duplicate.isPending}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Duplicate
                </button>
                {!s.isBuiltin && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFormStyle(s)}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(s)}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Delete
                    </button>
                  </>
                )}
              </div>
              <p className="mt-auto pt-3 text-xs leading-relaxed text-[var(--dim)]">
                <span className="font-semibold">Steers with:</span>{" "}
                {s.modifier}
              </p>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-[var(--dim)]">
        Looking for a film to watch instead?{" "}
        <button
          type="button"
          onClick={onHome}
          className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Back to Home
        </button>
      </p>

      {formStyle && (
        <StyleFormDialog
          initial={formStyle === "new" ? null : formStyle}
          onClose={() => setFormStyle(null)}
          onSaved={invalidateStyles}
        />
      )}
      {useStyle && (
        <UseStyleDialog
          style={useStyle}
          onClose={() => setUseStyle(null)}
          onOpenStudio={onOpenStudio}
        />
      )}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${confirmDelete.name}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-[var(--radius)] bg-[var(--surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-bold">
              Delete “{confirmDelete.name}”?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
              The style is removed from the library. Any project filming in
              it falls back to the Noir look — its existing stills don't
              change.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => del.mutate(confirmDelete)}
                className="flex-1 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {del.isPending ? "Deleting…" : "Delete style"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold"
              >
                Keep it
              </button>
            </div>
            {del.isError && (
              <p className="mt-2 text-sm text-red-700">
                That didn't delete. Try again.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// Create / edit a user style. The app drafts the prompt modifier from the
// description; the user can edit it before saving. Saving a new style
// also generates its thumbnail.
function StyleFormDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: StyleRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<StyleCategory>(
    initial?.category ?? "Cinematic",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [modifier, setModifier] = useState(initial?.modifier ?? "");

  const draft = useMutation({
    mutationFn: () =>
      api.draftStyleModifier({
        name: name.trim(),
        description: description.trim(),
      }),
    onSuccess: (data) => setModifier(data.modifier),
  });
  const save = useMutation({
    mutationFn: async () =>
      initial
        ? await api.updateStyle({
            styleId: initial.id,
            name: name.trim(),
            category,
            description: description.trim(),
            modifier: modifier.trim(),
          })
        : await api.createStyle({
            name: name.trim(),
            category,
            description: description.trim(),
            modifier: modifier.trim(),
          }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });
  const regenThumb = useMutation({
    mutationFn: () =>
      api.generateStyleThumbnail({ styleId: initial?.id ?? 0 }),
    onSuccess: onSaved,
  });

  const canDraft =
    name.trim().length >= 1 && description.trim().length >= 3;
  const canSave =
    canDraft && modifier.trim().length >= 3 && !save.isPending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={initial ? `Edit ${initial.name}` : "Create my style"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">
            {initial ? "Edit your style" : "Create my style"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--border)] p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label htmlFor="style-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="style-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Smoky Vaudeville"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="style-category" className="text-sm font-medium">
              Category
            </label>
            <select
              id="style-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as StyleCategory)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
            >
              {STYLE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="style-desc" className="text-sm font-medium">
              What does it look like?
            </label>
            <textarea
              id="style-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="A smoky 1920s vaudeville stage — footlights, velvet curtains, sepia haze…"
              className="mt-1 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-base focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="style-modifier" className="text-sm font-medium">
                Prompt modifier — the text that steers generation
              </label>
              <button
                type="button"
                disabled={!canDraft || draft.isPending}
                onClick={() => draft.mutate()}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold disabled:opacity-50"
              >
                {draft.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <WandSparkles className="h-3.5 w-3.5" aria-hidden />
                )}
                Draft it for me
              </button>
            </div>
            <textarea
              id="style-modifier"
              value={modifier}
              onChange={(e) => setModifier(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="1920s vaudeville stage photography, warm footlights, velvet curtain backdrop, sepia haze…"
              className="mt-1 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
            {draft.isError && (
              <p className="mt-1 text-sm text-red-700">
                The draft didn't come through — write the modifier yourself
                or try again.
              </p>
            )}
          </div>
          {initial && (
            <div className="flex items-center gap-3">
              {initial.imageUrl ? (
                <img
                  src={initial.imageUrl}
                  alt=""
                  className="h-12 w-20 rounded object-cover"
                />
              ) : (
                <span className="text-sm text-[var(--dim)]">
                  No thumbnail yet
                </span>
              )}
              <button
                type="button"
                disabled={regenThumb.isPending}
                onClick={() => regenThumb.mutate()}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                {regenThumb.isPending
                  ? "Generating…"
                  : initial.imageUrl
                    ? "Regenerate thumbnail"
                    : "Generate thumbnail"}
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={!canSave}
            onClick={() => save.mutate()}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
          >
            {save.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {initial ? "Saving…" : "Saving & generating thumbnail…"}
              </>
            ) : initial ? (
              "Save changes"
            ) : (
              "Save style"
            )}
          </button>
          {save.isError && (
            <p className="text-sm text-red-700">
              That didn't save. Try again in a moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// "Use this style": start a new film in the style, or apply it to one of
// the user's existing projects.
function UseStyleDialog({
  style,
  onClose,
  onOpenStudio,
}: {
  style: StyleRow;
  onClose: () => void;
  onOpenStudio: (id: number, focus?: StudioFocus) => void;
}) {
  const queryClient = useQueryClient();
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });
  const mine = (projects.data?.projects ?? []).filter((p) => !p.isSample);

  const fresh = useMutation({
    mutationFn: () => api.createBlankProject({ styleId: style.id }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onClose();
      onOpenStudio(data.projectId);
    },
  });
  const apply = useMutation({
    mutationFn: (projectId: number) =>
      api.setProjectStyle({ projectId, styleId: style.id }),
    onSuccess: (_data, projectId) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
      onClose();
      onOpenStudio(projectId);
    },
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Use ${style.name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">
            Film in {style.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--border)] p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          disabled={fresh.isPending}
          onClick={() => fresh.mutate()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[#f6f3ec] disabled:opacity-50"
        >
          {fresh.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          New film in this style
        </button>
        <p className="mt-5 text-sm font-semibold">
          Or switch a project you already have
        </p>
        {projects.isPending && (
          <p className="mt-2 text-sm text-[var(--dim)]">Loading projects…</p>
        )}
        {projects.isSuccess && mine.length === 0 && (
          <p className="mt-2 text-sm text-[var(--dim)]">
            No projects yet — the new-film button above is the way in.
          </p>
        )}
        <ul className="mt-2 flex flex-col gap-1.5">
          {mine.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {p.title}
                </span>
                <span className="block text-xs text-[var(--dim)]">
                  Currently: {p.style}
                </span>
              </span>
              <button
                type="button"
                disabled={apply.isPending}
                onClick={() => apply.mutate(p.id)}
                className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
              >
                Use {style.name}
              </button>
            </li>
          ))}
        </ul>
        {(fresh.isError || apply.isError) && (
          <p className="mt-3 text-sm text-red-700">
            That didn't go through. Try again.
          </p>
        )}
      </div>
    </div>
  );
}

// The studio's style settings (Stage 7): switch a project between the six
// built-in styles and any library style. The pick steers generation from
// then on; existing stills keep the look they were filmed with.
function StudioStyleDialog({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const libraryStyles = useQuery({
    queryKey: ["styles"],
    queryFn: () => api.listStyles({}),
  });
  const libraryList = libraryStyles.data?.styles ?? [];
  const set = useMutation({
    mutationFn: async (pick: { styleId?: number; builtin?: Style }) =>
      pick.styleId
        ? await api.setProjectStyle({
            projectId: project.id,
            styleId: pick.styleId,
          })
        : await api.setProjectStyle({
            projectId: project.id,
            builtin: pick.builtin,
          }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change project style"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] bg-[var(--surface)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Project style</h2>
            <p className="mt-1 text-sm text-[var(--dim)]">
              Currently filming in{" "}
              <strong className="text-[var(--text)]">{project.style}</strong>
              {project.styleId ? " (a library style)" : ""}. New generations
              use the new style; stills already filmed keep their look.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--border)] p-1.5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold">Built-in styles</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLES.map((s) => {
            const active = project.styleId === null && project.style === s;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                disabled={set.isPending}
                onClick={() => set.mutate({ builtin: s })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium disabled:opacity-50 ${
                  active
                    ? "bg-[var(--ink)] text-[#f6f3ec]"
                    : "border border-[var(--border)] hover:border-[var(--accent)]"
                }`}
              >
                {s}
                {active ? " · current" : ""}
              </button>
            );
          })}
        </div>
        <p className="mt-5 text-sm font-semibold">From the styles library</p>
        {libraryStyles.isPending && (
          <p className="mt-2 text-sm text-[var(--dim)]">Loading styles…</p>
        )}
        {libraryStyles.isSuccess && libraryList.length === 0 && (
          <p className="mt-2 text-sm text-[var(--dim)]">
            The library is empty — open the Library tab to set it up.
          </p>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {libraryList.map((s) => {
            const active = project.styleId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                disabled={set.isPending}
                onClick={() => set.mutate({ styleId: s.id })}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left disabled:opacity-50 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                }`}
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-[var(--ink)]">
                    <Palette
                      className="h-4 w-4 text-[var(--ink-dim)]"
                      aria-hidden
                    />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {s.name}
                    {active ? " · current" : ""}
                  </span>
                  <span className="block text-xs text-[var(--dim)]">
                    {s.category}
                    {s.isBuiltin ? "" : " · Yours"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {set.isPending && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--dim)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Switching style…
          </p>
        )}
        {set.isError && (
          <p className="mt-3 text-sm text-red-700">
            That switch didn't save. Try again.
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Studio -------------------------------- */

function scrollToId(id: string) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ------------------------- Script outline (Stage 3) ----------------------- */
//
// Mirrors the server's forgiving fountain heading parse: a scene heading is
// a line starting INT. / EXT. / INT./EXT. / EST. (optionally dot-forced).
// Used for the Story view's scene outline, coverage chips, and counts.

const SCRIPT_HEADING_RE =
  /^(?:\.\s*)?(INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.)\s+\S/i;

type ScriptOutlineEntry = {
  heading: string;
  offset: number;
  lineIndex: number;
  blockText: string;
};

function scriptOutline(text: string): ScriptOutlineEntry[] {
  const lines = text.split("\n");
  const entries: ScriptOutlineEntry[] = [];
  let offset = 0;
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line && line.length <= 120 && SCRIPT_HEADING_RE.test(line)) {
      entries.push({
        heading: line.replace(/\s+/g, " "),
        offset: offset + (raw.length - raw.trimStart().length),
        lineIndex: i,
        blockText: "",
      });
    }
    offset += raw.length + 1;
  });
  entries.forEach((entry, i) => {
    const next = entries[i + 1];
    entry.blockText = text.slice(
      entry.offset,
      next ? next.offset : text.length,
    );
  });
  return entries;
}

function normalizeHeading(h: string): string {
  return h.trim().replace(/\s+/g, " ").toLowerCase();
}

// Entry paths land in a specific studio section (Bible for characters-first,
// Story for script-first). Scrolls once, after the project has loaded.
function StudioFocusScroll({
  focus,
  ready,
}: {
  focus?: StudioFocus;
  ready: boolean;
}) {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || !focus || done.current) return;
    done.current = true;
    const id = focus === "bible" ? "studio-bible" : "studio-story";
    const t = setTimeout(() => scrollToId(id), 80);
    return () => clearTimeout(t);
  }, [ready, focus]);
  return null;
}

// The storyboard starting point for projects that begin empty — Script to
// Film, Blank canvas, and characters-first projects all land here with zero
// scenes. Whatever is already in the Bible is written into the storyboard's
// context server-side and is never touched by generating the storyboard.
function ScriptStartPanel({
  projectId,
  hasBible,
  onDone,
}: {
  projectId: number;
  hasBible: boolean;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const write = useMutation({
    mutationFn: () =>
      api.storyboardFromScript({ projectId, text: text.trim() }),
    onSuccess: () => {
      setText("");
      onDone();
    },
  });
  return (
    <section
      aria-label="Write your storyboard"
      className="mt-6 rounded-[var(--radius)] border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-4"
    >
      <h2 className="font-display flex items-center gap-2 text-xl font-bold">
        <FileText className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        Start the storyboard
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
        Paste a script, or just write the story in your own words — FilmKit
        breaks it into scenes and titles the film.
        {hasBible &&
          " Your Bible already has entries: the storyboard will be written for those characters and places, and they stay exactly as they are."}
      </p>
      <label
        htmlFor="script-start-text"
        className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        Your script or story
      </label>
      <textarea
        id="script-start-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={6000}
        placeholder="INT. LIGHTHOUSE – NIGHT. Mara climbs the iron stairs as the storm hits… — or plain prose, either works."
        className="mt-0.5 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => write.mutate()}
          disabled={write.isPending || text.trim().length < 10}
          className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-base font-semibold text-white disabled:opacity-40"
        >
          {write.isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Writing your storyboard…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" aria-hidden />
              Write the storyboard
            </>
          )}
        </button>
        <span className="text-sm text-[var(--dim)]">
          {write.isPending
            ? "Breaking it into scenes — about 20 seconds."
            : "Or skip this and add scenes one at a time below."}
        </span>
      </div>
      {write.isError && (
        <p className="mt-2 text-sm text-red-700">
          The storyboard didn't come through. Try again in a moment.
        </p>
      )}
    </section>
  );
}

/* ------------------------------ Story view ------------------------------- */
//
// Stage 3: the project's script document. A fountain-style writing surface
// (headings like "INT. KITCHEN - DAY", CAPS speaker names, dialogue, action
// lines — plain structured text works too) that autosaves, imports scripts,
// writes one from the project's idea, revises with AI (accept/discard, never
// auto-overwrite), and plans the storyboard from its scene headings.

type PlanResult = ApiResponse<typeof api, "planShotsFromScript">;

function StoryPanel({
  projectId,
  script,
  prompt,
  readOnly,
  scenes,
  characters,
  locations,
  autoImport,
  jump,
  onChanged,
}: {
  projectId: number;
  script: string | null;
  prompt: string;
  readOnly: boolean;
  scenes: Scene[];
  characters: Character[];
  locations: FilmLocation[];
  autoImport: boolean;
  jump: { heading: string; nonce: number } | null;
  onChanged: () => void;
}) {
  const [text, setText] = useState(script ?? "");
  const savedRef = useRef(script ?? "");
  const textRef = useRef(text);
  textRef.current = text;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [saveState, setSaveState] = useState<
    "saved" | "dirty" | "saving" | "error"
  >("saved");
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  // Import dialog state.
  const [importOpen, setImportOpen] = useState(autoImport && !readOnly);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">(
    "replace",
  );

  // AI writing state: a draft (from the idea, or an Edit-with-AI revision)
  // waits here for the user to keep or discard it.
  const [aiOpen, setAiOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [pendingDraft, setPendingDraft] = useState<{
    kind: "idea" | "edit";
    text: string;
  } | null>(null);

  // Plan-my-shots state: when the storyboard already has scenes, the user
  // picks append vs replace first — planning never wipes silently.
  const [planChoiceOpen, setPlanChoiceOpen] = useState(false);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);

  const save = useMutation({
    mutationFn: (t: string) => api.saveScript({ projectId, text: t }),
    onSuccess: (_data, t) => {
      savedRef.current = t;
      setSaveState(t === textRef.current ? "saved" : "dirty");
      onChanged();
    },
    onError: () => setSaveState("error"),
  });
  const saveRef = useRef(save);
  saveRef.current = save;

  // Autosave: 900ms after the last keystroke.
  useEffect(() => {
    if (readOnly) return;
    if (text === savedRef.current) return;
    setSaveState("dirty");
    const t = setTimeout(() => {
      setSaveState("saving");
      saveRef.current.mutate(textRef.current);
    }, 900);
    return () => clearTimeout(t);
  }, [text, readOnly]);

  const writeFromIdea = useMutation({
    mutationFn: () => api.writeScriptFromIdea({ projectId }),
    onSuccess: (data) => setPendingDraft({ kind: "idea", text: data.script }),
  });
  const editWithAi = useMutation({
    mutationFn: () =>
      api.editScriptWithAi({ projectId, instruction: instruction.trim() }),
    onSuccess: (data) => setPendingDraft({ kind: "edit", text: data.script }),
  });
  const plan = useMutation({
    mutationFn: (mode: "append" | "replace") =>
      api.planShotsFromScript({ projectId, mode }),
    onSuccess: (data) => {
      setPlanResult(data);
      setPlanChoiceOpen(false);
      onChanged();
    },
  });

  const outline = scriptOutline(text);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const boardedHeadings = new Set<string>();
  for (const s of scenes) {
    if (s.scriptHeading) boardedHeadings.add(normalizeHeading(s.scriptHeading));
  }

  const selectEntry = (entry: ScriptOutlineEntry) => {
    const ta = editorRef.current;
    setActiveHeading(entry.heading);
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(entry.offset, entry.offset + entry.heading.length);
    ta.scrollTop = Math.max(0, (entry.lineIndex - 3) * 26);
  };

  // "View in script" from a storyboard scene card lands here.
  useEffect(() => {
    if (!jump) return;
    const entry = scriptOutline(textRef.current).find(
      (e) => normalizeHeading(e.heading) === normalizeHeading(jump.heading),
    );
    if (entry) selectEntry(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);

  const applyImport = () => {
    if (!importText.trim()) return;
    if (importMode === "replace" || !text.trim()) {
      setText(importText);
    } else {
      setText(`${text.replace(/\s+$/, "")}\n\n${importText}`);
    }
    setImportOpen(false);
    setImportText("");
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setImportText(content.slice(0, 60000));
  };

  const planShots = () => {
    setPlanResult(null);
    if (scenes.length === 0) plan.mutate("append");
    else setPlanChoiceOpen(true);
  };

  if (readOnly) {
    return (
      <section aria-label="Story" className="mt-8">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Story
        </h2>
        {script ? (
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm leading-[26px]">
            {script}
          </pre>
        ) : (
          <p className="mt-2 text-sm text-[var(--dim)]">
            Sample films are read-only and don't carry a script document.
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Story" className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <ScrollText className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Story
        </h2>
        <span className="text-sm text-[var(--dim)]">
          {outline.length} {outline.length === 1 ? "scene" : "scenes"} ·{" "}
          {words} words
        </span>
        <span
          className="ml-auto text-xs text-[var(--dim)]"
          role="status"
          aria-live="polite"
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "dirty"
              ? "Unsaved changes"
              : saveState === "error"
                ? "Save failed — your text is still here and retries on your next edit"
                : text.trim()
                  ? "Script saved"
                  : ""}
        </span>
      </div>

      {outline.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
            Scenes in this script
          </p>
          <ol className="mt-2 space-y-1.5">
            {outline.map((entry, i) => {
              const boarded = boardedHeadings.has(
                normalizeHeading(entry.heading),
              );
              const castHere = characters.filter((c) =>
                entry.blockText
                  .toLowerCase()
                  .includes(c.name.trim().toLowerCase()),
              );
              const active = activeHeading === entry.heading;
              return (
                <li key={`${entry.offset}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectEntry(entry)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                      active
                        ? "border-[var(--accent)] bg-[var(--surface)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <span className="font-mono font-semibold">
                      {entry.heading}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        boarded
                          ? "bg-[#8fd18a]/25 text-[#2e5b27]"
                          : "bg-[var(--bg)] text-[var(--dim)]"
                      }`}
                    >
                      {boarded ? "On the storyboard" : "Not storyboarded yet"}
                    </span>
                    {castHere.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--dim)]"
                      >
                        {c.name}
                      </span>
                    ))}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <label
        htmlFor="script-editor"
        className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        Script — scene headings, action, dialogue
      </label>
      <textarea
        id="script-editor"
        ref={editorRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        maxLength={60000}
        spellCheck={false}
        placeholder={
          "INT. KITCHEN - DAY\n\nMara stares at the letter on the table. She hasn't opened it.\n\nMARA\n(whispering)\nNot today."
        }
        className="mt-0.5 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm leading-[26px] focus:outline-none"
      />
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--dim)]">
        Screenplay style helps but isn't required: start a scene with a
        heading like INT. KITCHEN - DAY, put a speaker's name in CAPS before
        their lines, and write the rest as action. It saves as you type.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          aria-expanded={importOpen}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Import a script
        </button>
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          aria-expanded={aiOpen}
          disabled={!text.trim()}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Edit with AI
        </button>
        <button
          type="button"
          onClick={planShots}
          disabled={!text.trim() || plan.isPending}
          className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
        >
          {plan.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Planning shots…
            </>
          ) : (
            <>
              <Clapperboard className="h-4 w-4" aria-hidden />
              Plan my shots
            </>
          )}
        </button>
        {prompt.trim() && !text.trim() && (
          <button
            type="button"
            onClick={() => writeFromIdea.mutate()}
            disabled={writeFromIdea.isPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {writeFromIdea.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Writing your script…
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" aria-hidden />
                Write a script from my idea
              </>
            )}
          </button>
        )}
      </div>

      {writeFromIdea.isError && (
        <p className="mt-2 text-sm text-red-700">
          The script didn't come through. Try again in a moment.
        </p>
      )}
      {plan.isError && (
        <p className="mt-2 text-sm text-red-700">
          Planning the shots didn't work. Your script and storyboard are
          unchanged — try again.
        </p>
      )}
      {planResult && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-sm leading-relaxed">
            {planResult.fromHeadings
              ? `Planned ${planResult.created} storyboard scenes from the ${planResult.scriptScenes} scenes in your script. Bible entries your script names were tagged automatically.`
              : `Your script has no scene headings, so FilmKit wrote ${planResult.created} storyboard scenes from its story instead.`}
          </p>
          <button
            type="button"
            onClick={() => scrollToId("studio-storyboard")}
            className="mt-2 text-sm font-semibold text-[var(--accent)]"
          >
            Go to the storyboard
          </button>
        </div>
      )}

      {planChoiceOpen && (
        <div className="mt-3 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-sm leading-relaxed">
            Your storyboard already has {scenes.length}{" "}
            {scenes.length === 1 ? "scene" : "scenes"}. Planning from the
            script can add to it, or start the storyboard over.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => plan.mutate("append")}
              disabled={plan.isPending}
              className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
            >
              Add to the storyboard
            </button>
            <button
              type="button"
              onClick={() => plan.mutate("replace")}
              disabled={plan.isPending}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Replace — removes existing scenes, tags, and stills
            </button>
            <button
              type="button"
              onClick={() => setPlanChoiceOpen(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <h3 className="font-display text-lg font-bold">Import a script</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
            Paste script text below, or load a .txt, .fountain, or .md file.
          </p>
          <label
            htmlFor="import-script-text"
            className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
          >
            Script text
          </label>
          <textarea
            id="import-script-text"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            maxLength={60000}
            placeholder="INT. SOMEWHERE - DAY …"
            className="mt-0.5 w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none"
          />
          <div className="mt-3">
            <label
              htmlFor="import-script-file"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
            >
              Or load a file
            </label>
            <input
              id="import-script-file"
              type="file"
              accept=".txt,.fountain,.md,text/plain"
              onChange={(e) => void onImportFile(e.target.files?.[0])}
              className="mt-1 block w-full text-sm"
            />
          </div>
          <fieldset className="mt-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
              Where it goes
            </legend>
            <div className="mt-1.5 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                />
                Replace the current script
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="import-mode"
                  checked={importMode === "append"}
                  onChange={() => setImportMode("append")}
                />
                Add to the end
              </label>
            </div>
          </fieldset>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={applyImport}
              disabled={!importText.trim()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Import into the editor
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <h3 className="font-display flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            Edit with AI
          </h3>
          <label
            htmlFor="ai-edit-instruction"
            className="mt-2 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
          >
            What should change?
          </label>
          <input
            id="ai-edit-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={300}
            placeholder="Make the ending darker · add a scene in the cottage · shorten the dialogue"
            className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => editWithAi.mutate()}
              disabled={
                editWithAi.isPending || instruction.trim().length < 3
              }
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {editWithAi.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Revising…
                </>
              ) : (
                "Revise the script"
              )}
            </button>
            <span className="text-sm text-[var(--dim)]">
              You'll see the revision first — nothing changes until you keep
              it.
            </span>
          </div>
          {editWithAi.isError && (
            <p className="mt-2 text-sm text-red-700">
              The revision didn't come through. Your script is unchanged.
            </p>
          )}
        </div>
      )}

      {pendingDraft && (
        <div className="mt-3 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-4">
          <h3 className="font-display text-lg font-bold">
            {pendingDraft.kind === "idea"
              ? "Your script draft"
              : "AI revision — review before it replaces your script"}
          </h3>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm leading-[26px]">
            {pendingDraft.text}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setText(pendingDraft.text);
                setPendingDraft(null);
                setInstruction("");
              }}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              <Check className="h-4 w-4" aria-hidden />
              {pendingDraft.kind === "idea"
                ? "Use this script"
                : "Keep the revision"}
            </button>
            <button
              type="button"
              onClick={() => setPendingDraft(null)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
            >
              <X className="h-4 w-4" aria-hidden />
              Discard
            </button>
          </div>
        </div>
      )}

      {(characters.length > 0 || locations.length > 0) &&
        outline.length === 0 && (
        <p className="mt-3 text-xs leading-relaxed text-[var(--dim)]">
          Tip: name your Bible characters and locations in the script — when
          you plan the shots, scenes are tagged to them automatically.
        </p>
      )}
    </section>
  );
}

function StudioView({
  projectId,
  focus,
  onBack,
  onWatch,
}: {
  projectId: number;
  focus?: StudioFocus;
  onBack: () => void;
  onWatch: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject({ projectId }),
  });

  const [scriptJump, setScriptJump] = useState<{
    heading: string;
    nonce: number;
  } | null>(null);
  // Bible drafts handed over from the canvas chat (Stage 4): the chat's
  // bible proposals route into the Bible panel's review flow.
  const [chatBibleDrafts, setChatBibleDrafts] = useState<BibleDraft | null>(
    null,
  );
  const acctQ = useAccount();
  const [genError, setGenError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bulkRunning = useRef(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["account"] });
  };

  const generateOne = async (sceneId: number) => {
    setGeneratingId(sceneId);
    setGenError(null);
    try {
      await api.generateScene({ sceneId });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed. Try again.");
    } finally {
      setGeneratingId(null);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    }
  };

  const generateAll = async () => {
    if (bulkRunning.current || !data.data) return;
    const pending = data.data.scenes.filter((s) => s.status !== "ready");
    if (pending.length === 0) return;
    bulkRunning.current = true;
    setBulkProgress({ current: 0, total: pending.length });
    setGenError(null);
    try {
      for (const [i, scene] of pending.entries()) {
        setBulkProgress({ current: i + 1, total: pending.length });
        setGeneratingId(scene.id);
        try {
          await api.generateScene({ sceneId: scene.id });
        } catch (e) {
          setGenError(e instanceof Error ? e.message : "A generation failed — stopping here. Credits for failed runs are refunded automatically.");
          break;
        }
        invalidate();
      }
    } finally {
      bulkRunning.current = false;
      setGeneratingId(null);
      setBulkProgress(null);
      invalidate();
    }
  };

  const del = useMutation({
    mutationFn: () => api.deleteProject({ projectId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      onBack();
    },
  });

  if (data.isPending) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <Loader2
          className="mx-auto h-8 w-8 animate-spin text-[var(--dim)]"
          aria-hidden
        />
        <p className="mt-3 text-sm text-[var(--dim)]">
          Opening the storyboard…
        </p>
      </main>
    );
  }
  if (data.isError || !data.data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <BackButton onBack={onBack} />
        <p className="mt-6 text-base">
          This film couldn't be opened. It may have been deleted.
        </p>
      </main>
    );
  }

  const { project, scenes, characters, locations, script } = data.data;
  const imgModelSel = acctQ.data?.account.models.find((m) => m.id === project.imageModel);
  const imgCost = imgModelSel?.cost ?? 5;
  const scriptSceneCount = scriptOutline(script ?? "").length;
  const readyCount = scenes.filter((s) => s.status === "ready").length;
  const allReady = scenes.length > 0 && readyCount === scenes.length;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16">
      <StudioFocusScroll focus={focus} ready={data.isSuccess} />
      <div className="flex items-center justify-between py-4">
        <BackButton onBack={onBack} />
        {readyCount > 0 && (
          <button
            type="button"
            onClick={() => onWatch(projectId)}
            className="flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec]"
          >
            <Play className="h-4 w-4" aria-hidden />
            {allReady ? "Watch film" : "Preview film"}
          </button>
        )}
      </div>

      {/* Start anywhere inside the studio too: storyboard, Bible, and the
          player are one tap apart, whatever exists so far. */}
      <nav
        aria-label="Studio sections"
        className="flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-3"
      >
        <button
          type="button"
          onClick={() => scrollToId("studio-story")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <ScrollText className="h-4 w-4" aria-hidden />
          Story
          <span className="text-xs text-[var(--dim)]">
            {scriptSceneCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => scrollToId("studio-storyboard")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <Clapperboard className="h-4 w-4" aria-hidden />
          Storyboard
          <span className="text-xs text-[var(--dim)]">{scenes.length}</span>
        </button>
        <button
          type="button"
          onClick={() => scrollToId("studio-canvas")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Canvas
        </button>
        <button
          type="button"
          onClick={() => scrollToId("studio-stage")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <Video className="h-4 w-4" aria-hidden />
          Stage
        </button>
        <button
          type="button"
          onClick={() => scrollToId("studio-editor")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <Scissors className="h-4 w-4" aria-hidden />
          Editor
        </button>
        <button
          type="button"
          onClick={() => scrollToId("studio-bible")}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Bible
          <span className="text-xs text-[var(--dim)]">
            {characters.length + locations.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => readyCount > 0 && onWatch(projectId)}
          disabled={readyCount === 0}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-sm font-medium disabled:opacity-40"
        >
          <Play className="h-4 w-4" aria-hidden />
          {readyCount > 0 ? "Watch" : "Watch — film a scene first"}
        </button>
      </nav>

      <TitleEditor project={project} onSaved={invalidate} />
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        {project.isSample ? (
          <span className="mr-2 rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium">
            {project.style}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setStyleDialogOpen(true)}
            aria-label={`Change style — currently ${project.style}${project.styleId ? " (library style)" : ""}`}
            className="mr-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium hover:border-[var(--accent)]"
          >
            <Palette className="h-3.5 w-3.5" aria-hidden />
            {project.style}
            {project.styleId ? " · Library" : ""}
            <span className="font-semibold text-[var(--accent)]">Change</span>
          </button>
        )}
        {project.isSample && (
          <span className="mr-2 rounded-full bg-[#e8c476]/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#7a5a12]">
            Sample film
          </span>
        )}
        {project.prompt
          ? `“${project.prompt}”`
          : "No story yet — write one below, or build the Bible first and let the story find its cast."}
      </p>

      {styleDialogOpen && (
        <StudioStyleDialog
          project={project}
          onClose={() => setStyleDialogOpen(false)}
          onSaved={invalidate}
        />
      )}

      {!project.isSample && acctQ.data && (
        <ProjectModelPickers
          project={project}
          account={acctQ.data.account}
          onChanged={() => {
            invalidate();
            void queryClient.invalidateQueries({ queryKey: ["account"] });
          }}
        />
      )}
      {genError && (
        <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {genError}
        </p>
      )}

      <div id="studio-story" className="scroll-mt-24">
        <StoryPanel
          key={projectId}
          projectId={projectId}
          script={script}
          prompt={project.prompt}
          readOnly={project.isSample}
          scenes={scenes}
          characters={characters}
          locations={locations}
          autoImport={focus === "script"}
          jump={scriptJump}
          onChanged={invalidate}
        />
      </div>

      {!project.isSample && scenes.length === 0 && (
        <ScriptStartPanel
          projectId={projectId}
          hasBible={characters.length > 0 || locations.length > 0}
          onDone={invalidate}
        />
      )}

      {!project.isSample && scenes.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generateAll()}
            disabled={bulkProgress !== null || allReady}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-base font-semibold text-white disabled:opacity-40"
          >
            {bulkProgress ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Generating scene {bulkProgress.current} of {bulkProgress.total}…
              </>
            ) : allReady ? (
              "Every scene is filmed"
            ) : (
              <>
                <Sparkles className="h-5 w-5" aria-hidden />
                Generate all scenes · {(scenes.length - readyCount) * imgCost} credits
              </>
            )}
          </button>
          <span className="text-sm text-[var(--dim)]">
            {readyCount} of {scenes.length} scenes filmed · {imgCost} credits
            per scene with {imgModelSel?.name ?? "FilmKit Standard"} · each
            still takes about 15 seconds · text AI (storyboard, script, chat)
            is included at 0 credits
          </span>
        </div>
      )}

      <div id="studio-canvas" className="scroll-mt-24">
        <CanvasPanel
          key={`canvas-${projectId}`}
          projectId={projectId}
          readOnly={project.isSample}
          characters={characters}
          locations={locations}
          scenes={scenes}
          onChanged={invalidate}
          onReviewBible={(drafts) => {
            setChatBibleDrafts(drafts);
            scrollToId("studio-bible");
          }}
        />
      </div>

      <div id="studio-stage" className="scroll-mt-24">
        <StagePanel
          key={`stage-${projectId}`}
          projectId={projectId}
          readOnly={project.isSample}
          characters={characters}
          onChanged={invalidate}
        />
      </div>

      <div id="studio-editor" className="scroll-mt-24">
        <EditorPanel
          key={`editor-${projectId}`}
          projectId={projectId}
          title={project.title}
          readOnly={project.isSample}
          onChanged={invalidate}
        />
      </div>

      <div id="studio-bible" className="scroll-mt-24">
        <BiblePanel
          projectId={projectId}
          readOnly={project.isSample}
          characters={characters}
          locations={locations}
          scenes={scenes}
          onChanged={invalidate}
          externalDrafts={chatBibleDrafts}
          onExternalDraftsHandled={() => setChatBibleDrafts(null)}
        />
      </div>

      <h2
        id="studio-storyboard"
        className="font-display mt-10 scroll-mt-24 text-2xl font-bold"
      >
        Storyboard
      </h2>
      <ol className="mt-4 space-y-6">
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            total={scenes.length}
            cost={imgCost}
            readOnly={project.isSample}
            characters={characters}
            locations={locations}
            generating={generatingId === scene.id}
            anyGenerating={generatingId !== null}
            onGenerate={() => void generateOne(scene.id)}
            onViewInScript={(heading) => {
              setScriptJump({ heading, nonce: Date.now() });
              scrollToId("studio-story");
            }}
            onChanged={invalidate}
          />
        ))}
      </ol>

      {!project.isSample && (
        <>
          <AddSceneForm projectId={projectId} onAdded={invalidate} />
          <div className="mt-12 border-t border-[var(--border)] pt-6">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">Delete “{project.title}” for good?</span>
                <button
                  type="button"
                  onClick={() => del.mutate()}
                  disabled={del.isPending}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {del.isPending ? "Deleting…" : "Yes, delete it"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete this film
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Workspace
    </button>
  );
}

function TitleEditor({
  project,
  onSaved,
}: {
  project: ProjectData["project"];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  useEffect(() => setTitle(project.title), [project.title]);
  const rename = useMutation({
    mutationFn: (t: string) =>
      api.renameProject({ projectId: project.id, title: t }),
    onSuccess: onSaved,
  });
  if (project.isSample) {
    return (
      <h1 className="font-display text-4xl font-black leading-tight">
        {project.title}
      </h1>
    );
  }
  return (
    <div>
      <label htmlFor="film-title" className="sr-only">
        Film title
      </label>
      <input
        id="film-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="font-display w-full bg-transparent text-4xl font-black leading-tight focus:outline-none"
      />
      {title.trim() !== project.title && title.trim().length > 0 && (
        <button
          type="button"
          onClick={() => rename.mutate(title.trim())}
          disabled={rename.isPending}
          className="mt-2 rounded-lg bg-[var(--ink)] px-4 py-1.5 text-sm font-medium text-[#f6f3ec] disabled:opacity-50"
        >
          {rename.isPending ? "Saving…" : "Save title"}
        </button>
      )}
    </div>
  );
}

function SceneCard({
  scene,
  index,
  total,
  cost,
  readOnly,
  characters,
  locations,
  generating,
  anyGenerating,
  onGenerate,
  onViewInScript,
  onChanged,
}: {
  scene: Scene;
  index: number;
  total: number;
  cost: number;
  readOnly: boolean;
  characters: Character[];
  locations: FilmLocation[];
  generating: boolean;
  anyGenerating: boolean;
  onGenerate: () => void;
  onViewInScript: (heading: string) => void;
  onChanged: () => void;
}) {
  const scriptHeading = scene.scriptHeading;
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description);
  const [visualPrompt, setVisualPrompt] = useState(scene.visualPrompt);
  useEffect(() => {
    setTitle(scene.title);
    setDescription(scene.description);
    setVisualPrompt(scene.visualPrompt);
  }, [scene.id, scene.title, scene.description, scene.visualPrompt]);

  const dirty =
    title !== scene.title ||
    description !== scene.description ||
    visualPrompt !== scene.visualPrompt;

  const save = useMutation({
    mutationFn: () =>
      api.updateScene({
        sceneId: scene.id,
        title: title.trim(),
        description: description.trim(),
        visualPrompt: visualPrompt.trim(),
      }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteScene({ sceneId: scene.id }),
    onSuccess: onChanged,
  });
  const move = useMutation({
    mutationFn: (direction: "up" | "down") =>
      api.moveScene({ sceneId: scene.id, direction }),
    onSuccess: onChanged,
  });

  // Bible tags (location, characters, in-scene state) — local until saved.
  const [tagLocationId, setTagLocationId] = useState<number | null>(
    scene.locationId,
  );
  const [tagCharacterIds, setTagCharacterIds] = useState<number[]>(
    scene.characterIds,
  );
  const [stateNote, setStateNote] = useState(scene.stateNote ?? "");
  useEffect(() => {
    setTagLocationId(scene.locationId);
    setTagCharacterIds(scene.characterIds);
    setStateNote(scene.stateNote ?? "");
  }, [scene.id, scene.locationId, scene.characterIds, scene.stateNote]);

  const sameIds = (a: number[], b: number[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  const tagsDirty =
    tagLocationId !== scene.locationId ||
    !sameIds(tagCharacterIds, scene.characterIds) ||
    stateNote.trim() !== (scene.stateNote ?? "");
  const saveTags = useMutation({
    mutationFn: () =>
      api.setSceneBible({
        sceneId: scene.id,
        locationId: tagLocationId,
        characterIds: tagCharacterIds,
        stateNote,
      }),
    onSuccess: onChanged,
  });
  const toggleCharacter = (id: number) =>
    setTagCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  const taggedLocation = locations.find((l) => l.id === scene.locationId);
  const taggedCharacters = characters.filter((c) =>
    scene.characterIds.includes(c.id),
  );
  const hasBible = characters.length > 0 || locations.length > 0;

  return (
    <li className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="relative aspect-video w-full bg-[var(--ink)]">
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={`Scene ${index + 1}: ${scene.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center ${
              generating ? "frame-pulse" : ""
            }`}
          >
            <Film className="h-9 w-9 text-[#57534a]" aria-hidden />
            <p className="text-sm text-[#a49e90]">
              {generating
                ? `Generating scene ${index + 1}… painting the frame, this takes about 15 seconds.`
                : scene.status === "failed"
                  ? "The last generation didn't come through — try again."
                  : "Not filmed yet. Generate this scene to see it here."}
            </p>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
          Scene {index + 1}
        </span>
        {scene.status === "ready" && (
          <span className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-[#8fd18a]">
            Filmed
          </span>
        )}
      </div>

      <div className="px-4 py-4">
        {readOnly ? (
          <>
            <h3 className="font-display text-xl font-bold">{scene.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
              {scene.description}
            </p>
            {(taggedLocation || taggedCharacters.length > 0) && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {taggedLocation && (
                  <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--dim)]">
                    <MapPin className="mr-1 inline h-3 w-3" aria-hidden />
                    {taggedLocation.name}
                  </span>
                )}
                {taggedCharacters.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--dim)]"
                  >
                    {c.name}
                  </span>
                ))}
              </p>
            )}
          </>
        ) : (
          <>
            <label
              htmlFor={`scene-title-${scene.id}`}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
            >
              Scene title
            </label>
            <input
              id={`scene-title-${scene.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="font-display mt-0.5 w-full bg-transparent text-xl font-bold focus:outline-none"
            />
            <label
              htmlFor={`scene-desc-${scene.id}`}
              className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
            >
              What happens
            </label>
            <textarea
              id={`scene-desc-${scene.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-0.5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
            />
            <label
              htmlFor={`scene-visual-${scene.id}`}
              className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
            >
              Visual prompt for the AI camera
            </label>
            <textarea
              id={`scene-visual-${scene.id}`}
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              rows={3}
              maxLength={1200}
              className="mt-0.5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating || anyGenerating}
                className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Generating…
                  </>
                ) : scene.status === "ready" ? (
                  <>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Re-generate · {cost} credits
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Generate · {cost} credits
                  </>
                )}
              </button>
              {dirty && (
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={
                    save.isPending ||
                    !title.trim() ||
                    !description.trim() ||
                    !visualPrompt.trim()
                  }
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {save.isPending ? "Saving…" : "Save changes"}
                </button>
              )}
              <span className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move scene ${index + 1} earlier`}
                  disabled={index === 0 || move.isPending}
                  onClick={() => move.mutate("up")}
                  className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Move scene ${index + 1} later`}
                  disabled={index === total - 1 || move.isPending}
                  onClick={() => move.mutate("down")}
                  className="rounded-lg border border-[var(--border)] p-2 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Delete scene ${index + 1}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                  className="rounded-lg border border-[var(--border)] p-2 text-red-700 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </span>
            </div>
            {save.isError && (
              <p className="mt-2 text-sm text-red-700">
                Those edits didn't save. Try again.
              </p>
            )}

            {hasBible && (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Bible tags — who and where
                </p>
                {locations.length > 0 && (
                  <>
                    <label
                      htmlFor={`scene-location-${scene.id}`}
                      className="mt-2 block text-xs font-medium text-[var(--dim)]"
                    >
                      Location
                    </label>
                    <select
                      id={`scene-location-${scene.id}`}
                      value={tagLocationId ?? ""}
                      onChange={(e) =>
                        setTagLocationId(
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        )
                      }
                      className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">No location tagged</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {characters.length > 0 && (
                  <fieldset className="mt-3">
                    <legend className="text-xs font-medium text-[var(--dim)]">
                      Characters in this scene
                    </legend>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {characters.map((c) => {
                        const on = tagCharacterIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={on}
                            aria-label={`Toggle ${c.name} in scene ${index + 1}`}
                            onClick={() => toggleCharacter(c.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                              on
                                ? "bg-[var(--accent)] text-white"
                                : "border border-[var(--border)] bg-[var(--bg)] text-[var(--dim)]"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                <label
                  htmlFor={`scene-state-${scene.id}`}
                  className="mt-3 block text-xs font-medium text-[var(--dim)]"
                >
                  In this scene… (state note — a change, a wound, a new coat)
                </label>
                <input
                  id={`scene-state-${scene.id}`}
                  value={stateNote}
                  onChange={(e) => setStateNote(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. Mara is wounded; wearing a stolen coat"
                  className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
                />
                {tagsDirty && (
                  <button
                    type="button"
                    onClick={() => saveTags.mutate()}
                    disabled={saveTags.isPending}
                    className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {saveTags.isPending ? "Saving tags…" : "Save tags"}
                  </button>
                )}
                {saveTags.isError && (
                  <p className="mt-2 text-sm text-red-700">
                    Those tags didn't save. Try again.
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-[var(--dim)]">
                  Tagged profiles are folded into the camera prompt when this
                  scene is generated, so the same people and places stay
                  consistent.
                </p>
              </div>
            )}
          </>
        )}
        {scriptHeading && (
          <button
            type="button"
            onClick={() => onViewInScript(scriptHeading)}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]"
          >
            <ScrollText className="h-4 w-4" aria-hidden />
            View in script — {scriptHeading}
          </button>
        )}
        {scene.lastPrompt && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-[var(--dim)]">
              Prompt sent to the camera for the latest still
            </summary>
            <p className="mt-1 text-xs leading-relaxed text-[var(--dim)]">
              {scene.lastPrompt}
            </p>
          </details>
        )}
      </div>
    </li>
  );
}

function AddSceneForm({
  projectId,
  onAdded,
}: {
  projectId: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visualPrompt, setVisualPrompt] = useState("");
  const add = useMutation({
    mutationFn: () =>
      api.addScene({
        projectId,
        title: title.trim(),
        description: description.trim(),
        visualPrompt: visualPrompt.trim(),
      }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setVisualPrompt("");
      setOpen(false);
      onAdded();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--border)] px-4 py-4 text-base font-medium text-[var(--dim)]"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add a scene
      </button>
    );
  }
  return (
    <div className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <h3 className="font-display text-lg font-bold">New scene</h3>
      <label
        htmlFor="new-scene-title"
        className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        Scene title
      </label>
      <input
        id="new-scene-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="The door opens"
        className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
      />
      <label
        htmlFor="new-scene-desc"
        className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        What happens
      </label>
      <textarea
        id="new-scene-desc"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder="One line: what happens in this scene?"
        className="mt-0.5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
      />
      <label
        htmlFor="new-scene-visual"
        className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        Visual prompt for the AI camera
      </label>
      <textarea
        id="new-scene-visual"
        value={visualPrompt}
        onChange={(e) => setVisualPrompt(e.target.value)}
        rows={3}
        maxLength={1200}
        placeholder="Describe the shot: subject, place, light, mood…"
        className="mt-0.5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={
            add.isPending ||
            !title.trim() ||
            !description.trim() ||
            !visualPrompt.trim()
          }
          className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
        >
          {add.isPending ? "Adding…" : "Add scene"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
      {add.isError && (
        <p className="mt-2 text-sm text-red-700">
          The scene didn't get added. Try again.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- Bible --------------------------------- */

function Field({
  id,
  label,
  value,
  onChange,
  rows,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength: number;
  placeholder?: string;
}) {
  return (
    <>
      <label
        htmlFor={id}
        className="mt-3 block text-xs font-semibold uppercase tracking-wider text-[var(--dim)]"
      >
        {label}
      </label>
      {rows ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="mt-0.5 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
        />
      )}
    </>
  );
}

function CharacterFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: CharacterDraft;
  onChange: (v: CharacterDraft) => void;
}) {
  const set =
    (k: keyof CharacterDraft) =>
    (v: string) =>
      onChange({ ...value, [k]: v });
  return (
    <>
      <Field id={`${prefix}-name`} label="Name" value={value.name} onChange={set("name")} maxLength={80} placeholder="Mara Venn" />
      <Field id={`${prefix}-role`} label="Role" value={value.role} onChange={set("role")} maxLength={80} placeholder="Lead, supporting, antagonist…" />
      <Field id={`${prefix}-appearance`} label="Appearance" value={value.appearance} onChange={set("appearance")} rows={3} maxLength={600} placeholder="Age, build, face, hair — specific enough to draw the same person twice" />
      <Field id={`${prefix}-wardrobe`} label="Wardrobe" value={value.wardrobe} onChange={set("wardrobe")} rows={2} maxLength={400} placeholder="The outfit they live in, head to toe" />
      <Field id={`${prefix}-personality`} label="Personality" value={value.personality} onChange={set("personality")} rows={2} maxLength={400} placeholder="How they carry themselves; what shows on their face" />
      <Field id={`${prefix}-backstory`} label="Backstory" value={value.backstory} onChange={set("backstory")} rows={3} maxLength={800} placeholder="Where they came from, what they want, what haunts them" />
    </>
  );
}

function LocationFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: LocationDraft;
  onChange: (v: LocationDraft) => void;
}) {
  const set =
    (k: keyof LocationDraft) =>
    (v: string) =>
      onChange({ ...value, [k]: v });
  return (
    <>
      <Field id={`${prefix}-name`} label="Name" value={value.name} onChange={set("name")} maxLength={80} placeholder="The Drowned Saloon" />
      <Field id={`${prefix}-description`} label="Description" value={value.description} onChange={set("description")} rows={3} maxLength={600} placeholder="Architecture, materials, key props — specific enough to draw the same place twice" />
      <Field id={`${prefix}-mood`} label="Mood" value={value.mood} onChange={set("mood")} rows={2} maxLength={300} placeholder="What the place feels like" />
      <Field id={`${prefix}-lighting`} label="Lighting" value={value.lighting} onChange={set("lighting")} rows={2} maxLength={300} placeholder="Light sources, color, contrast" />
      <Field id={`${prefix}-time`} label="Time of day" value={value.timeOfDay} onChange={set("timeOfDay")} maxLength={80} placeholder="Dawn, high noon, blue hour, deep night…" />
    </>
  );
}

const characterValid = (c: CharacterDraft) =>
  [c.name, c.role, c.appearance, c.wardrobe, c.personality, c.backstory].every(
    (s) => s.trim().length > 0,
  );
const locationValid = (l: LocationDraft) =>
  [l.name, l.description, l.mood, l.lighting, l.timeOfDay].every(
    (s) => s.trim().length > 0,
  );
const trimCharacter = (c: CharacterDraft): CharacterDraft => ({
  name: c.name.trim(),
  role: c.role.trim(),
  appearance: c.appearance.trim(),
  wardrobe: c.wardrobe.trim(),
  personality: c.personality.trim(),
  backstory: c.backstory.trim(),
});
const trimLocation = (l: LocationDraft): LocationDraft => ({
  name: l.name.trim(),
  description: l.description.trim(),
  mood: l.mood.trim(),
  lighting: l.lighting.trim(),
  timeOfDay: l.timeOfDay.trim(),
});
const emptyCharacter = (): CharacterDraft => ({
  name: "",
  role: "",
  appearance: "",
  wardrobe: "",
  personality: "",
  backstory: "",
});
const emptyLocation = (): LocationDraft => ({
  name: "",
  description: "",
  mood: "",
  lighting: "",
  timeOfDay: "",
});

function ProfileLine({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-2 text-sm leading-relaxed">
      <span className="font-semibold">{label}: </span>
      <span className="text-[var(--dim)]">{text}</span>
    </p>
  );
}

function CharacterCard({
  character,
  readOnly,
  onChanged,
}: {
  character: Character;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<CharacterDraft>(character);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!editing) setFields(character);
  }, [character, editing]);

  const gen = useMutation({
    mutationFn: () => api.generateCharacterImage({ characterId: character.id }),
    onSuccess: onChanged,
  });
  const save = useMutation({
    mutationFn: () =>
      api.updateCharacter({
        characterId: character.id,
        ...trimCharacter(fields),
      }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteCharacter({ characterId: character.id }),
    onSuccess: onChanged,
  });

  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="relative aspect-video w-full bg-[var(--ink)]">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={`Portrait sheet of ${character.name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center ${
              gen.isPending ? "frame-pulse" : ""
            }`}
          >
            <Users className="h-9 w-9 text-[#57534a]" aria-hidden />
            <p className="text-sm text-[#a49e90]">
              {gen.isPending
                ? `Casting ${character.name}… painting the portrait sheet, about 15 seconds.`
                : character.status === "failed"
                  ? "The portrait didn't come through — try again."
                  : "No portrait yet. Generate one to fix their face and wardrobe."}
            </p>
          </div>
        )}
        {character.status === "ready" && (
          <span className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-[#8fd18a]">
            Portrait ready
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        {editing ? (
          <>
            <CharacterFields
              prefix={`char-${character.id}`}
              value={fields}
              onChange={setFields}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending || !characterValid(fields)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {save.isPending ? "Saving…" : "Save profile"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
            {save.isError && (
              <p className="mt-2 text-sm text-red-700">
                That profile didn't save. Try again.
              </p>
            )}
          </>
        ) : (
          <>
            <h4 className="font-display text-xl font-bold">
              {character.name}
              <span className="ml-2 align-middle rounded-full bg-[var(--bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--dim)]">
                {character.role}
              </span>
            </h4>
            <ProfileLine label="Appearance" text={character.appearance} />
            <ProfileLine label="Wardrobe" text={character.wardrobe} />
            <ProfileLine label="Personality" text={character.personality} />
            <ProfileLine label="Backstory" text={character.backstory} />
            {!readOnly && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => gen.mutate()}
                  disabled={gen.isPending}
                  className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                >
                  {gen.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Generating…
                    </>
                  ) : character.status === "ready" ? (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Re-generate portrait
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Generate portrait
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={() => remove.mutate()}
                      disabled={remove.isPending}
                      className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {remove.isPending ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete character ${character.name}`}
                    onClick={() => setConfirmDelete(true)}
                    className="ml-auto rounded-lg border border-[var(--border)] p-2 text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
            {gen.isError && (
              <p className="mt-2 text-sm text-red-700">
                The portrait request failed. Try again.
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function LocationCard({
  location,
  readOnly,
  onChanged,
}: {
  location: FilmLocation;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<LocationDraft>(location);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!editing) setFields(location);
  }, [location, editing]);

  const gen = useMutation({
    mutationFn: () => api.generateLocationImage({ locationId: location.id }),
    onSuccess: onChanged,
  });
  const save = useMutation({
    mutationFn: () =>
      api.updateLocation({ locationId: location.id, ...trimLocation(fields) }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteLocation({ locationId: location.id }),
    onSuccess: onChanged,
  });

  return (
    <article className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="relative aspect-video w-full bg-[var(--ink)]">
        {location.imageUrl ? (
          <img
            src={location.imageUrl}
            alt={`Establishing view of ${location.name}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center ${
              gen.isPending ? "frame-pulse" : ""
            }`}
          >
            <MapPin className="h-9 w-9 text-[#57534a]" aria-hidden />
            <p className="text-sm text-[#a49e90]">
              {gen.isPending
                ? `Scouting ${location.name}… painting the establishing view, about 15 seconds.`
                : location.status === "failed"
                  ? "The view didn't come through — try again."
                  : "No establishing view yet. Generate one to fix how this place looks."}
            </p>
          </div>
        )}
        {location.status === "ready" && (
          <span className="absolute right-3 top-3 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-[#8fd18a]">
            View ready
          </span>
        )}
      </div>
      <div className="px-4 py-4">
        {editing ? (
          <>
            <LocationFields
              prefix={`loc-${location.id}`}
              value={fields}
              onChange={setFields}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending || !locationValid(fields)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {save.isPending ? "Saving…" : "Save profile"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
            {save.isError && (
              <p className="mt-2 text-sm text-red-700">
                That profile didn't save. Try again.
              </p>
            )}
          </>
        ) : (
          <>
            <h4 className="font-display text-xl font-bold">{location.name}</h4>
            <ProfileLine label="The place" text={location.description} />
            <ProfileLine label="Mood" text={location.mood} />
            <ProfileLine label="Lighting" text={location.lighting} />
            <ProfileLine label="Time of day" text={location.timeOfDay} />
            {!readOnly && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => gen.mutate()}
                  disabled={gen.isPending}
                  className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                >
                  {gen.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Generating…
                    </>
                  ) : location.status === "ready" ? (
                    <>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Re-generate view
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Generate view
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Edit
                </button>
                {confirmDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={() => remove.mutate()}
                      disabled={remove.isPending}
                      className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {remove.isPending ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                    >
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete location ${location.name}`}
                    onClick={() => setConfirmDelete(true)}
                    className="ml-auto rounded-lg border border-[var(--border)] p-2 text-red-700"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            )}
            {gen.isError && (
              <p className="mt-2 text-sm text-red-700">
                The view request failed. Try again.
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function AddCharacterForm({
  projectId,
  onAdded,
}: {
  projectId: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<CharacterDraft>(emptyCharacter());
  const add = useMutation({
    mutationFn: () =>
      api.addCharacter({ projectId, ...trimCharacter(fields) }),
    onSuccess: () => {
      setFields(emptyCharacter());
      setOpen(false);
      onAdded();
    },
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--border)] px-4 py-4 text-base font-medium text-[var(--dim)]"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add a character
      </button>
    );
  }
  return (
    <div className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <h4 className="font-display text-lg font-bold">New character</h4>
      <CharacterFields prefix="new-char" value={fields} onChange={setFields} />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={add.isPending || !characterValid(fields)}
          className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
        >
          {add.isPending ? "Adding…" : "Add character"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
      {add.isError && (
        <p className="mt-2 text-sm text-red-700">
          The character didn't get added. Try again.
        </p>
      )}
    </div>
  );
}

function AddLocationForm({
  projectId,
  onAdded,
}: {
  projectId: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<LocationDraft>(emptyLocation());
  const add = useMutation({
    mutationFn: () => api.addLocation({ projectId, ...trimLocation(fields) }),
    onSuccess: () => {
      setFields(emptyLocation());
      setOpen(false);
      onAdded();
    },
  });
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--border)] px-4 py-4 text-base font-medium text-[var(--dim)]"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add a location
      </button>
    );
  }
  return (
    <div className="mt-5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <h4 className="font-display text-lg font-bold">New location</h4>
      <LocationFields prefix="new-loc" value={fields} onChange={setFields} />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => add.mutate()}
          disabled={add.isPending || !locationValid(fields)}
          className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
        >
          {add.isPending ? "Adding…" : "Add location"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
      {add.isError && (
        <p className="mt-2 text-sm text-red-700">
          The location didn't get added. Try again.
        </p>
      )}
    </div>
  );
}

function BiblePanel({
  projectId,
  readOnly,
  characters,
  locations,
  scenes,
  onChanged,
  externalDrafts,
  onExternalDraftsHandled,
}: {
  projectId: number;
  readOnly: boolean;
  characters: Character[];
  locations: FilmLocation[];
  scenes: Scene[];
  onChanged: () => void;
  // Drafts handed over from the canvas AI chat (Stage 4): they open in
  // this same review flow — edit, add, or discard; nothing pre-saved.
  externalDrafts?: BibleDraft | null;
  onExternalDraftsHandled?: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draftChars, setDraftChars] = useState<CharacterDraft[]>([]);
  const [draftLocs, setDraftLocs] = useState<LocationDraft[]>([]);
  const [draftTags, setDraftTags] = useState<BibleDraft["sceneTags"]>([]);
  const [tagsApplied, setTagsApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!externalDrafts) return;
    setDraftChars(externalDrafts.characters);
    setDraftLocs(externalDrafts.locations);
    setDraftTags([]);
    setTagsApplied(false);
    setReviewOpen(true);
    onExternalDraftsHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDrafts]);

  const develop = useMutation({
    mutationFn: () => api.developBible({ projectId }),
    onSuccess: (d) => {
      setDraftChars(d.characters);
      setDraftLocs(d.locations);
      setDraftTags(d.sceneTags);
      setTagsApplied(false);
      setReviewOpen(true);
    },
  });
  const acceptChar = useMutation({
    mutationFn: (c: CharacterDraft) =>
      api.addCharacter({ projectId, ...trimCharacter(c) }),
    onSuccess: (_data, c) => {
      setDraftChars((prev) => prev.filter((x) => x !== c));
      onChanged();
    },
  });
  const acceptLoc = useMutation({
    mutationFn: (l: LocationDraft) =>
      api.addLocation({ projectId, ...trimLocation(l) }),
    onSuccess: (_data, l) => {
      setDraftLocs((prev) => prev.filter((x) => x !== l));
      onChanged();
    },
  });

  const applyTags = async () => {
    setApplying(true);
    try {
      for (const t of draftTags) {
        const scene = scenes.find((s) => s.id === t.sceneId);
        if (!scene) continue;
        const loc = t.locationName
          ? locations.find((l) => l.name === t.locationName)
          : undefined;
        const ids = t.characterNames
          .map((n) => characters.find((c) => c.name === n)?.id)
          .filter((id): id is number => typeof id === "number");
        await api.setSceneBible({
          sceneId: t.sceneId,
          locationId: loc ? loc.id : scene.locationId,
          characterIds: ids.length > 0 ? ids : scene.characterIds,
          stateNote: scene.stateNote ?? "",
        });
      }
      setTagsApplied(true);
      onChanged();
    } finally {
      setApplying(false);
    }
  };

  if (readOnly && characters.length === 0 && locations.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <BookOpen className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          The Bible
        </h2>
        {!readOnly && scenes.length > 0 && (
          <button
            type="button"
            onClick={() => develop.mutate()}
            disabled={develop.isPending}
            className="ml-auto flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {develop.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Developing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden />
                Develop characters &amp; locations
              </>
            )}
          </button>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
        Developed characters and locations for this film — real profiles, not
        just reference pictures. Tag scenes with them and every generated
        frame stays true to the same people and the same places.
      </p>
      <BibleCostNote projectId={projectId} />
      {develop.isPending && (
        <p className="mt-2 text-xs text-[var(--dim)]">
          Reading your storyboard and developing the cast and the world — this
          takes about 20 seconds.
        </p>
      )}
      {develop.isError && (
        <p className="mt-2 text-sm text-red-700">
          The development pass didn't come through. Try again in a moment.
        </p>
      )}

      {reviewOpen && (
        <div className="mt-4 rounded-[var(--radius)] border-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-bold">
              Draft bible — review before saving
            </h3>
            <button
              type="button"
              aria-label="Close draft review"
              onClick={() => setReviewOpen(false)}
              className="ml-auto rounded-lg border border-[var(--border)] p-1.5"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--dim)]">
            Edit anything, add what's good, discard the rest. Nothing here
            touches your bible until you add it.
          </p>

          {draftChars.length === 0 && draftLocs.length === 0 && (
            <p className="mt-3 text-sm text-[var(--dim)]">
              Every draft has been handled — your bible below is up to date.
            </p>
          )}

          {draftChars.map((c, i) => (
            <div
              key={`dc-${i}`}
              className="mt-4 border-t border-[var(--border)] pt-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
                <Users className="h-3.5 w-3.5" aria-hidden />
                Draft character
              </p>
              <CharacterFields
                prefix={`draft-char-${i}`}
                value={c}
                onChange={(v) =>
                  setDraftChars((prev) =>
                    prev.map((x, j) => (j === i ? v : x)),
                  )
                }
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => acceptChar.mutate(c)}
                  disabled={acceptChar.isPending || !characterValid(c)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Add to bible
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraftChars((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          ))}
          {acceptChar.isError && (
            <p className="mt-2 text-sm text-red-700">
              That character didn't save. Try again.
            </p>
          )}

          {draftLocs.map((l, i) => (
            <div
              key={`dl-${i}`}
              className="mt-4 border-t border-[var(--border)] pt-2"
            >
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Draft location
              </p>
              <LocationFields
                prefix={`draft-loc-${i}`}
                value={l}
                onChange={(v) =>
                  setDraftLocs((prev) =>
                    prev.map((x, j) => (j === i ? v : x)),
                  )
                }
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => acceptLoc.mutate(l)}
                  disabled={acceptLoc.isPending || !locationValid(l)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Add to bible
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraftLocs((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Discard
                </button>
              </div>
            </div>
          ))}
          {acceptLoc.isError && (
            <p className="mt-2 text-sm text-red-700">
              That location didn't save. Try again.
            </p>
          )}

          {draftTags.length > 0 && (
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dim)]">
                Suggested scene tags
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--dim)]">
                {draftTags.map((t) => {
                  const scene = scenes.find((s) => s.id === t.sceneId);
                  if (!scene) return null;
                  return (
                    <li key={t.sceneId}>
                      <span className="font-medium text-[var(--text)]">
                        {scene.title}
                      </span>
                      {t.locationName ? ` · ${t.locationName}` : ""}
                      {t.characterNames.length > 0
                        ? ` · ${t.characterNames.join(", ")}`
                        : ""}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => void applyTags()}
                disabled={applying || tagsApplied}
                className="mt-3 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
              >
                {applying
                  ? "Applying tags…"
                  : tagsApplied
                    ? "Tags applied"
                    : "Apply suggested scene tags"}
              </button>
              <p className="mt-2 text-xs text-[var(--dim)]">
                Tags apply to entries already in your bible — add the drafts
                you want first, then apply. Existing tags are kept wherever a
                suggestion doesn't resolve.
              </p>
            </div>
          )}
        </div>
      )}

      <h3 className="mt-8 flex items-center gap-2 text-lg font-bold">
        <Users className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        Characters
        <span className="text-sm font-normal text-[var(--dim)]">
          {characters.length} developed
        </span>
      </h3>
      {characters.length === 0 && (
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--dim)]">
          No characters yet. Develop them from your storyboard, or write one
          from scratch — look, wardrobe, personality, backstory.
        </p>
      )}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {characters.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ))}
      </div>
      {!readOnly && (
        <AddCharacterForm projectId={projectId} onAdded={onChanged} />
      )}

      <h3 className="mt-8 flex items-center gap-2 text-lg font-bold">
        <MapPin className="h-5 w-5 text-[var(--accent)]" aria-hidden />
        Locations
        <span className="text-sm font-normal text-[var(--dim)]">
          {locations.length} developed
        </span>
      </h3>
      {locations.length === 0 && (
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--dim)]">
          No locations yet. Develop them from your storyboard, or write one
          from scratch — the place, its mood, its light.
        </p>
      )}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {locations.map((l) => (
          <LocationCard
            key={l.id}
            location={l}
            readOnly={readOnly}
            onChanged={onChanged}
          />
        ))}
      </div>
      {!readOnly && (
        <AddLocationForm projectId={projectId} onAdded={onChanged} />
      )}
    </section>
  );
}

/* --------------------------------- Canvas -------------------------------- */
//
// Stage 4: the node board. Desktop gets a pannable/zoomable board; at
// phone width the same nodes stack into section groups (see FEATURES.md
// §7). Node cards and media cards are shared by both layouts.

const NODE_W = 264;

function MediaItemCard({
  item,
  readOnly,
  scenes,
  onChanged,
}: {
  item: MediaItem;
  readOnly: boolean;
  scenes: Scene[];
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(item.name);
  const [sendSceneId, setSendSceneId] = useState<number | "">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => setName(item.name), [item.id, item.name]);

  const patch = useMutation({
    mutationFn: (p: {
      name?: string;
      favorite?: boolean;
      archived?: boolean;
      inEditorBin?: boolean;
    }) => api.updateMediaItem({ mediaId: item.id, ...p }),
    onSuccess: onChanged,
  });
  const duplicate = useMutation({
    mutationFn: () => api.duplicateMediaItem({ mediaId: item.id }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteMediaItem({ mediaId: item.id }),
    onSuccess: onChanged,
  });
  const regen = useMutation({
    mutationFn: () => api.regenerateMediaItem({ mediaId: item.id }),
    onSuccess: onChanged,
  });
  const makeClip = useMutation({
    mutationFn: () => api.makeClipFromMedia({ mediaId: item.id, note: "" }),
    onSuccess: onChanged,
  });
  const sendToScene = useMutation({
    mutationFn: (sceneId: number) =>
      api.sendMediaToScene({ mediaId: item.id, sceneId }),
    onSuccess: onChanged,
  });

  const iconBtn =
    "rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2 disabled:opacity-40";

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <div className="relative aspect-video w-full bg-[var(--ink)]">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`h-full w-full object-cover ${
              item.kind === "clip" ? "kb-a" : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-[#a49e90]">
            No image yet
          </div>
        )}
        {item.kind === "clip" && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-[#e8c476]">
            <Video className="h-3 w-3" aria-hidden />
            Motion clip
          </span>
        )}
        {item.favorite && (
          <span className="absolute right-2 top-2 rounded bg-black/70 p-1">
            <Star
              className="h-3.5 w-3.5 fill-[#e8c476] text-[#e8c476]"
              aria-hidden
            />
          </span>
        )}
        {item.archived && (
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            Archived
          </span>
        )}
      </div>

      <div className="px-2.5 py-2">
        {renaming && !readOnly ? (
          <div className="flex items-center gap-1.5">
            <input
              aria-label={`Rename ${item.name}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs focus:outline-none"
            />
            <button
              type="button"
              aria-label="Save new name"
              disabled={!name.trim() || patch.isPending}
              onClick={() =>
                patch.mutate({ name: name.trim() }, {
                  onSuccess: () => setRenaming(false),
                })
              }
              className="rounded-md bg-[var(--accent)] p-1.5 text-white disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Cancel rename"
              onClick={() => setRenaming(false)}
              className="rounded-md border border-[var(--border)] p-1.5"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <p className="truncate text-xs font-medium" title={item.name}>
            {item.name}
          </p>
        )}
        {item.kind === "clip" && item.prompt && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--dim)]">
            {item.prompt}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-label={item.favorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
            aria-pressed={item.favorite}
            disabled={readOnly || patch.isPending}
            onClick={() => patch.mutate({ favorite: !item.favorite })}
            className={iconBtn}
          >
            <Star
              className={`h-4 w-4 ${item.favorite ? "fill-[#b97f1e] text-[#b97f1e]" : ""}`}
              aria-hidden
            />
          </button>
          {!readOnly && (
            <button
              type="button"
              aria-label={`Rename ${item.name}`}
              onClick={() => setRenaming(true)}
              className={iconBtn}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}
          {item.imageUrl && (
            <a
              href={item.imageUrl}
              download={item.name}
              aria-label={`Download ${item.name}`}
              className={`${iconBtn} inline-flex`}
            >
              <Download className="h-4 w-4" aria-hidden />
            </a>
          )}
          {item.imageUrl && (
            <button
              type="button"
              aria-label={`View ${item.name} fullscreen`}
              onClick={() => setFullscreen(true)}
              className={iconBtn}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              aria-label={`Duplicate ${item.name}`}
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate()}
              className={iconBtn}
            >
              <Copy className="h-4 w-4" aria-hidden />
            </button>
          )}
          {!readOnly && item.kind === "image" && (
            <button
              type="button"
              aria-label={`Regenerate ${item.name}`}
              disabled={regen.isPending}
              onClick={() => regen.mutate()}
              className={iconBtn}
            >
              {regen.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
          {!readOnly && item.kind !== "clip" && item.imageUrl && (
            <button
              type="button"
              aria-label={`Make a motion clip from ${item.name}`}
              disabled={makeClip.isPending}
              onClick={() => makeClip.mutate()}
              className={iconBtn}
            >
              {makeClip.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Video className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
          <button
            type="button"
            aria-label={
              item.inEditorBin
                ? `Remove ${item.name} from the editor bin`
                : `Add ${item.name} to the editor bin`
            }
            aria-pressed={item.inEditorBin}
            disabled={readOnly || patch.isPending}
            onClick={() => patch.mutate({ inEditorBin: !item.inEditorBin })}
            className={`rounded-lg px-2 py-2 text-[11px] font-semibold disabled:opacity-40 ${
              item.inEditorBin
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] bg-[var(--bg)]"
            }`}
          >
            Editor bin
          </button>
          <button
            type="button"
            aria-label={item.archived ? `Unarchive ${item.name}` : `Archive ${item.name}`}
            disabled={readOnly || patch.isPending}
            onClick={() => patch.mutate({ archived: !item.archived })}
            className={iconBtn}
          >
            {item.archived ? (
              <ArchiveRestore className="h-4 w-4" aria-hidden />
            ) : (
              <Archive className="h-4 w-4" aria-hidden />
            )}
          </button>
          {!readOnly &&
            (confirmDelete ? (
              <button
                type="button"
                aria-label={`Confirm delete ${item.name}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
                className="rounded-lg bg-red-700 px-2 py-2 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                Delete?
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Delete ${item.name}`}
                onClick={() => setConfirmDelete(true)}
                className={`${iconBtn} text-red-700`}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ))}
        </div>

        {!readOnly && scenes.length > 0 && item.imageUrl && (
          <div className="mt-2 flex items-center gap-1.5">
            <label
              htmlFor={`send-scene-${item.id}`}
              className="sr-only"
            >
              Scene to receive {item.name}
            </label>
            <select
              id={`send-scene-${item.id}`}
              value={sendSceneId}
              onChange={(e) =>
                setSendSceneId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="">Send to a scene…</option>
              {scenes.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Scene {i + 1}: {s.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={sendSceneId === "" || sendToScene.isPending}
              onClick={() =>
                sendSceneId !== "" && sendToScene.mutate(sendSceneId)
              }
              className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--ink)] px-2 py-1.5 text-[11px] font-semibold text-[#f6f3ec] disabled:opacity-40"
            >
              <Clapperboard className="h-3.5 w-3.5" aria-hidden />
              {sendToScene.isPending ? "Sending…" : "Send"}
            </button>
          </div>
        )}
        {sendToScene.isSuccess && (
          <p className="mt-1 text-[11px] font-medium text-green-700">
            Set as that scene's still.
          </p>
        )}
        {(patch.isError ||
          duplicate.isError ||
          regen.isError ||
          makeClip.isError ||
          sendToScene.isError) && (
          <p className="mt-1 text-[11px] text-red-700">
            That didn't go through. Try again.
          </p>
        )}
      </div>

      {fullscreen && item.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${item.name} fullscreen`}
          className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-white">
              {item.name}
              {item.kind === "clip" && (
                <span className="ml-2 rounded bg-[#e8c476]/20 px-2 py-0.5 text-[11px] font-semibold text-[#e8c476]">
                  Motion clip — pan/zoom over the start frame
                </span>
              )}
            </p>
            <button
              type="button"
              aria-label="Close fullscreen view"
              onClick={() => setFullscreen(false)}
              className="rounded-full border border-white/30 p-2 text-white"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-lg">
            <img
              src={item.imageUrl}
              alt={item.name}
              className={`absolute inset-0 h-full w-full object-contain ${
                item.kind === "clip" ? "kb-a" : ""
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({
  projectId,
  node,
  media,
  allNodes,
  allMedia,
  links,
  sections,
  characters,
  locations,
  scenes,
  readOnly,
  boardMode,
  onChanged,
  onHeaderPointerDown,
}: {
  projectId: number;
  node: CanvasNode;
  media: MediaItem[];
  allNodes: CanvasNode[];
  allMedia: MediaItem[];
  links: CanvasLink[];
  sections: CanvasSection[];
  characters: Character[];
  locations: FilmLocation[];
  scenes: Scene[];
  readOnly: boolean;
  boardMode: boolean;
  onChanged: () => void;
  onHeaderPointerDown?: (e: ReactPointerEvent, node: CanvasNode) => void;
}) {
  const acctQ = useAccount();
  const projQ = useQuery({ queryKey: ["project", projectId], queryFn: () => api.getProject({ projectId }) });
  const imgModel = acctQ.data?.account.models.find((m) => m.id === projQ.data?.project.imageModel);
  const vidModel = acctQ.data?.account.models.find((m) => m.id === projQ.data?.project.videoModel);
  const [title, setTitle] = useState(node.title);
  const [text, setText] = useState(node.text);
  const [prompt, setPrompt] = useState(node.prompt);
  const [quantity, setQuantity] = useState(node.quantity);
  const [clipNote, setClipNote] = useState("");
  const [wireTargetId, setWireTargetId] = useState<number | "">("");
  const [frameMediaId, setFrameMediaId] = useState<number | "">("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    setTitle(node.title);
    setText(node.text);
    setPrompt(node.prompt);
    setQuantity(node.quantity);
  }, [node.id, node.title, node.text, node.prompt, node.quantity]);

  // Bible tags (image nodes) — same pattern as scene tagging.
  const [tagLocationId, setTagLocationId] = useState<number | null>(
    node.locationId,
  );
  const [tagCharacterIds, setTagCharacterIds] = useState<number[]>(
    node.characterIds,
  );
  useEffect(() => {
    setTagLocationId(node.locationId);
    setTagCharacterIds(node.characterIds);
  }, [node.id, node.locationId, node.characterIds]);
  const sameIds = (a: number[], b: number[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  const tagsDirty =
    tagLocationId !== node.locationId ||
    !sameIds(tagCharacterIds, node.characterIds);
  const saveTags = useMutation({
    mutationFn: () =>
      api.setNodeBible({
        nodeId: node.id,
        locationId: tagLocationId,
        characterIds: tagCharacterIds,
      }),
    onSuccess: onChanged,
  });

  const update = useMutation({
    mutationFn: (p: Parameters<typeof api.updateCanvasNode>[0]) =>
      api.updateCanvasNode(p),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => api.deleteCanvasNode({ nodeId: node.id }),
    onSuccess: onChanged,
  });
  const run = useMutation({
    mutationFn: () => api.runImageNode({ nodeId: node.id }),
    onSuccess: onChanged,
  });
  const runClip = useMutation({
    mutationFn: () => api.runClipNode({ nodeId: node.id, note: clipNote }),
    onSuccess: onChanged,
  });
  const connect = useMutation({
    mutationFn: (args: {
      fromKind: "node" | "media";
      fromId: number;
      toNodeId: number;
    }) => api.connectCanvas({ projectId, ...args }),
    onSuccess: onChanged,
  });
  const disconnect = useMutation({
    mutationFn: (linkId: number) => api.disconnectCanvas({ linkId }),
    onSuccess: onChanged,
  });

  const promptLink = links.find(
    (l) => l.toNodeId === node.id && l.kind === "prompt_source",
  );
  const promptSourceNode = promptLink
    ? allNodes.find((n) => n.id === promptLink.fromId)
    : undefined;
  const outgoing = links.filter(
    (l) => l.fromKind === "node" && l.fromId === node.id,
  );
  const frameLink = links.find(
    (l) => l.toNodeId === node.id && l.kind === "start_frame",
  );
  const frameItem = frameLink
    ? allMedia.find((m) => m.id === frameLink.fromId)
    : undefined;
  const imageNodes = allNodes.filter(
    (n) => n.type === "image" && n.id !== node.id,
  );
  const hasBible = characters.length > 0 || locations.length > 0;
  const fieldsDirty =
    title.trim() !== node.title ||
    text !== node.text ||
    prompt !== node.prompt ||
    quantity !== node.quantity;

  const typeIcon =
    node.type === "note" ? (
      <StickyNote className="h-4 w-4" aria-hidden />
    ) : node.type === "image" ? (
      <ImagePlus className="h-4 w-4" aria-hidden />
    ) : node.type === "clip" ? (
      <Video className="h-4 w-4" aria-hidden />
    ) : (
      <Upload className="h-4 w-4" aria-hidden />
    );
  const typeLabel =
    node.type === "note"
      ? "Text note"
      : node.type === "image"
        ? "Generate image"
        : node.type === "clip"
          ? "Frame to clip"
          : "Upload";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-sm ${
        boardMode ? "h-full" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2 ${
          boardMode && !readOnly ? "cursor-grab touch-none" : ""
        }`}
        onPointerDown={
          boardMode && onHeaderPointerDown
            ? (e) => onHeaderPointerDown(e, node)
            : undefined
        }
      >
        <span className="text-[var(--accent)]">{typeIcon}</span>
        {readOnly ? (
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {node.title}
          </span>
        ) : (
          <input
            aria-label={`Title of ${typeLabel} node`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            maxLength={80}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold focus:outline-none"
          />
        )}
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--dim)]">
          {typeLabel}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {!readOnly && (
          <div className="flex items-center gap-2">
            <label
              htmlFor={`node-section-${node.id}`}
              className="text-xs font-medium text-[var(--dim)]"
            >
              Section
            </label>
            <select
              id={`node-section-${node.id}`}
              value={node.sectionId ?? ""}
              onChange={(e) =>
                update.mutate({
                  nodeId: node.id,
                  sectionId:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="">No section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {confirmDelete ? (
              <button
                type="button"
                aria-label={`Confirm delete node ${node.title}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
                className="shrink-0 rounded-md bg-red-700 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                Delete?
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Delete node ${node.title}`}
                onClick={() => setConfirmDelete(true)}
                className="shrink-0 rounded-md border border-[var(--border)] p-1.5 text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}

        {node.type === "note" && (
          <>
            <label
              htmlFor={`note-text-${node.id}`}
              className="sr-only"
            >
              Note text for {node.title}
            </label>
            <textarea
              id={`note-text-${node.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={readOnly}
              rows={4}
              maxLength={2000}
              placeholder="Write anything — wire this note into an image node and its text becomes that node's prompt."
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
            />
            {!readOnly && imageNodes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor={`wire-note-${node.id}`}
                  className="sr-only"
                >
                  Image node this note feeds
                </label>
                <select
                  id={`wire-note-${node.id}`}
                  value={wireTargetId}
                  onChange={(e) =>
                    setWireTargetId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs focus:outline-none"
                >
                  <option value="">Feed an image node…</option>
                  {imageNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={wireTargetId === "" || connect.isPending}
                  onClick={() =>
                    wireTargetId !== "" &&
                    connect.mutate({
                      fromKind: "node",
                      fromId: node.id,
                      toNodeId: wireTargetId,
                    })
                  }
                  className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--ink)] px-2 py-1.5 text-[11px] font-semibold text-[#f6f3ec] disabled:opacity-40"
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  Connect
                </button>
              </div>
            )}
            {outgoing.map((l) => {
              const target = allNodes.find((n) => n.id === l.toNodeId);
              return (
                <p
                  key={l.id}
                  className="flex items-center gap-1.5 text-xs text-[var(--dim)]"
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Prompt for “{target?.title ?? "an image node"}”
                  {!readOnly && (
                    <button
                      type="button"
                      aria-label={`Disconnect note from ${target?.title ?? "image node"}`}
                      onClick={() => disconnect.mutate(l.id)}
                      className="rounded border border-[var(--border)] p-1"
                    >
                      <Unlink className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                </p>
              );
            })}
          </>
        )}

        {node.type === "image" && (
          <>
            {promptSourceNode ? (
              <p className="flex items-start gap-1.5 rounded-lg bg-[var(--bg)] px-2.5 py-2 text-xs leading-relaxed text-[var(--dim)]">
                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>
                  Prompt comes from the note “{promptSourceNode.title}”:
                  <span className="mt-0.5 block text-[var(--text)]">
                    {promptSourceNode.text || "(the note is empty)"}
                  </span>
                </span>
                {!readOnly && promptLink && (
                  <button
                    type="button"
                    aria-label="Disconnect the prompt note"
                    onClick={() => disconnect.mutate(promptLink.id)}
                    className="ml-auto shrink-0 rounded border border-[var(--border)] p-1"
                  >
                    <Unlink className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </p>
            ) : (
              <>
                <label
                  htmlFor={`image-prompt-${node.id}`}
                  className="block text-xs font-medium text-[var(--dim)]"
                >
                  Prompt
                </label>
                <textarea
                  id={`image-prompt-${node.id}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  readOnly={readOnly}
                  rows={3}
                  maxLength={1200}
                  placeholder="Describe the still — subject, composition, light…"
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
                />
              </>
            )}
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={`image-qty-${node.id}`}
                  className="text-xs font-medium text-[var(--dim)]"
                >
                  Stills per run
                </label>
                <select
                  id={`image-qty-${node.id}`}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs focus:outline-none"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[var(--dim)]">
                  16:9 · the project's style
                </span>
                <button
                  type="button"
                  onClick={() => run.mutate()}
                  disabled={run.isPending}
                  className="ml-auto flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                >
                  {run.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Run{imgModel ? ` · ${imgModel.cost * quantity} credits` : ""}
                    </>
                  )}
                </button>
              </div>
            )}
            {imgModel && (
              <p className="text-[11px] text-[var(--dim)]">
                {imgModel.name} · {modelCostLabel(imgModel)} per still{imgModel.locked ? ` · Locked — ${imgModel.lockReason}` : ""}. Pick models in the studio header.
              </p>
            )}
            {run.isPending && (
              <p className="text-xs text-[var(--dim)]">
                Painting {quantity} still{quantity > 1 ? "s" : ""} — about 15
                seconds each.
              </p>
            )}
            {run.isError && (
              <p className="text-xs text-red-700">
                {run.error instanceof Error ? run.error.message : "That run didn't come through — check the prompt and try again."}
              </p>
            )}
            {hasBible && (
              <div className="border-t border-[var(--border)] pt-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--dim)]">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Bible tags
                </p>
                {locations.length > 0 && (
                  <>
                    <label
                      htmlFor={`node-location-${node.id}`}
                      className="mt-2 block text-xs font-medium text-[var(--dim)]"
                    >
                      Location
                    </label>
                    <select
                      id={`node-location-${node.id}`}
                      value={tagLocationId ?? ""}
                      disabled={readOnly}
                      onChange={(e) =>
                        setTagLocationId(
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        )
                      }
                      className="mt-0.5 w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs focus:outline-none disabled:opacity-50"
                    >
                      <option value="">No location tagged</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {characters.length > 0 && (
                  <fieldset className="mt-2">
                    <legend className="text-xs font-medium text-[var(--dim)]">
                      Characters in frame
                    </legend>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {characters.map((c) => {
                        const on = tagCharacterIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={on}
                            aria-label={`Toggle ${c.name} on ${node.title}`}
                            disabled={readOnly}
                            onClick={() =>
                              setTagCharacterIds((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((x) => x !== c.id)
                                  : [...prev, c.id],
                              )
                            }
                            className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                              on
                                ? "bg-[var(--accent)] text-white"
                                : "border border-[var(--border)] bg-[var(--bg)] text-[var(--dim)]"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {!readOnly && tagsDirty && (
                  <button
                    type="button"
                    onClick={() => saveTags.mutate()}
                    disabled={saveTags.isPending}
                    className="mt-2 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    {saveTags.isPending ? "Saving tags…" : "Save tags"}
                  </button>
                )}
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--dim)]">
                  Tagged profiles fold into this node's prompt, like scenes.
                </p>
              </div>
            )}
            {node.lastPrompt && (
              <details>
                <summary className="cursor-pointer text-[11px] font-medium text-[var(--dim)]">
                  Prompt sent to the camera for the latest run
                </summary>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--dim)]">
                  {node.lastPrompt}
                </p>
              </details>
            )}
          </>
        )}

        {node.type === "clip" && (
          <>
            {frameItem ? (
              <p className="flex items-center gap-1.5 text-xs text-[var(--dim)]">
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Start frame: “{frameItem.name}”
                {!readOnly && frameLink && (
                  <button
                    type="button"
                    aria-label="Disconnect the start frame"
                    onClick={() => disconnect.mutate(frameLink.id)}
                    className="rounded border border-[var(--border)] p-1"
                  >
                    <Unlink className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </p>
            ) : (
              !readOnly && (
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor={`frame-media-${node.id}`}
                    className="sr-only"
                  >
                    Start frame for {node.title}
                  </label>
                  <select
                    id={`frame-media-${node.id}`}
                    value={frameMediaId}
                    onChange={(e) =>
                      setFrameMediaId(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="">Pick a start frame…</option>
                    {allMedia
                      .filter((m) => m.imageUrl && m.kind !== "clip")
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={frameMediaId === "" || connect.isPending}
                    onClick={() =>
                      frameMediaId !== "" &&
                      connect.mutate({
                        fromKind: "media",
                        fromId: frameMediaId,
                        toNodeId: node.id,
                      })
                    }
                    className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--ink)] px-2 py-1.5 text-[11px] font-semibold text-[#f6f3ec] disabled:opacity-40"
                  >
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Wire frame
                  </button>
                </div>
              )
            )}
            <label
              htmlFor={`clip-note-${node.id}`}
              className="block text-xs font-medium text-[var(--dim)]"
            >
              Animation note
            </label>
            <input
              id={`clip-note-${node.id}`}
              value={clipNote}
              onChange={(e) => setClipNote(e.target.value)}
              readOnly={readOnly}
              maxLength={300}
              placeholder="e.g. Slow push-in as the beam sweeps past"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:outline-none"
            />
            <p className="text-[11px] leading-relaxed text-[var(--dim)]">
              A motion clip presents the start frame with a slow cinematic
              pan/zoom — real video models arrive with the model-catalog
              stage.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => runClip.mutate()}
                disabled={!frameItem || runClip.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
              >
                {runClip.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Making clip…
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" aria-hidden />
                    Make motion clip{vidModel ? ` · ${vidModel.cost} credits` : ""}
                  </>
                )}
              </button>
            )}
            {vidModel && (
              <p className="text-[11px] leading-relaxed text-[var(--dim)]">
                {vidModel.name} · {modelCostLabel(vidModel)} per clip — fulfilled as a motion clip by the built-in engine{vidModel.locked ? ` · Locked — ${vidModel.lockReason}` : ""}.
              </p>
            )}
            {runClip.isError && (
              <p className="text-xs text-red-700">
                {runClip.error instanceof Error ? runClip.error.message : "Wire a start frame in first, then try again."}
              </p>
            )}
          </>
        )}

        {node.type === "upload" && (
          <p className="text-xs leading-relaxed text-[var(--dim)]">
            An image from your device, kept in this project's assets. Use it
            as a start frame for a motion clip, or send it to a scene.
          </p>
        )}

        {!readOnly && fieldsDirty && (
          <button
            type="button"
            onClick={() =>
              update.mutate({
                nodeId: node.id,
                title: title.trim() || node.title,
                text,
                prompt,
                quantity,
              })
            }
            disabled={update.isPending || !title.trim()}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {update.isPending ? "Saving…" : "Save node"}
          </button>
        )}
        {update.isError && (
          <p className="text-xs text-red-700">
            Those edits didn't save. Try again.
          </p>
        )}

        {media.length > 0 && (
          <div className="space-y-2 border-t border-[var(--border)] pt-2.5">
            {media.map((m) => (
              <MediaItemCard
                key={m.id}
                item={m}
                readOnly={readOnly}
                scenes={scenes}
                onChanged={onChanged}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CanvasBoard({
  sections,
  nodes,
  links,
  allMedia,
  renderNode,
}: {
  sections: CanvasSection[];
  nodes: CanvasNode[];
  links: CanvasLink[];
  allMedia: MediaItem[];
  renderNode: (
    node: CanvasNode,
    headerPointerDown: (e: ReactPointerEvent, node: CanvasNode) => void,
  ) => ReactNode;
}) {
  const [view, setView] = useState({ x: 24, y: 24, k: 1 });
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { mode: "pan"; startX: number; startY: number; vx: number; vy: number }
    | { mode: "node"; id: number; grabDX: number; grabDY: number }
    | null
  >(null);
  const movedRef = useRef(false);
  const queryClient = useQueryClient();

  // Local positions mirror the server's; new nodes adopt their saved spot,
  // existing ones keep the user's in-flight drag position.
  useEffect(() => {
    setPositions((prev) => {
      const next: Record<number, { x: number; y: number }> = {};
      for (const n of nodes) next[n.id] = prev[n.id] ?? { x: n.x, y: n.y };
      return next;
    });
  }, [nodes]);

  const toBoard = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - view.x) / view.k,
      y: (clientY - rect.top - view.y) / view.k,
    };
  };

  const onHeaderPointerDown = (e: ReactPointerEvent, node: CanvasNode) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const p = toBoard(e.clientX, e.clientY);
    const pos = positions[node.id] ?? { x: node.x, y: node.y };
    dragRef.current = {
      mode: "node",
      id: node.id,
      grabDX: p.x - pos.x,
      grabDY: p.y - pos.y,
    };
    movedRef.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onBackgroundPointerDown = (e: ReactPointerEvent) => {
    if (e.target !== e.currentTarget) return;
    dragRef.current = {
      mode: "pan",
      startX: e.clientX,
      startY: e.clientY,
      vx: view.x,
      vy: view.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "pan") {
      setView((v) => ({
        ...v,
        x: drag.vx + (e.clientX - drag.startX),
        y: drag.vy + (e.clientY - drag.startY),
      }));
    } else {
      const p = toBoard(e.clientX, e.clientY);
      movedRef.current = true;
      setPositions((prev) => ({
        ...prev,
        [drag.id]: {
          x: Math.max(0, p.x - drag.grabDX),
          y: Math.max(0, p.y - drag.grabDY),
        },
      }));
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === "node" && movedRef.current) {
      const pos = positions[drag.id];
      if (pos) {
        void api
          .updateCanvasNode({ nodeId: drag.id, x: pos.x, y: pos.y })
          .then(() => {
            void queryClient.invalidateQueries({ queryKey: ["canvas"] });
          });
      }
    }
    movedRef.current = false;
  };

  const posOf = (n: CanvasNode) => positions[n.id] ?? { x: n.x, y: n.y };

  // Section frames: the bounding box of each section's visible nodes.
  const frames = sections
    .map((s) => {
      const members = nodes.filter((n) => n.sectionId === s.id);
      if (members.length === 0) return null;
      const xs = members.map((n) => posOf(n).x);
      const ys = members.map((n) => posOf(n).y);
      return {
        section: s,
        left: Math.min(...xs) - 14,
        top: Math.min(...ys) - 34,
        width: Math.max(...xs) - Math.min(...xs) + NODE_W + 28,
        height: Math.max(...ys) - Math.min(...ys) + 460,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const mediaNodePos = (m: MediaItem) => {
    if (m.nodeId == null) return null;
    const n = nodeById.get(m.nodeId);
    return n ? posOf(n) : null;
  };

  return (
    <div>
      <div
        ref={boardRef}
        role="application"
        aria-label="Canvas board. Drag a node's header to move it; drag the background to pan."
        className="relative h-[600px] touch-none overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[#efe9db]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d8d0ba 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
            width: 4000,
            height: 3000,
          }}
        >
          {frames.map((f) => (
            <div
              key={f.section.id}
              className="absolute rounded-xl border-2 border-dashed border-[#c9bfa4] bg-white/30"
              style={{
                left: f.left,
                top: f.top,
                width: f.width,
                height: f.height,
              }}
            >
              <span className="absolute left-3 top-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a7d5c]">
                {f.section.name}
              </span>
            </div>
          ))}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={4000}
            height={3000}
            aria-hidden
          >
            {links.map((l) => {
              const target = nodeById.get(l.toNodeId);
              if (!target) return null;
              const tp = posOf(target);
              let sp: { x: number; y: number } | null = null;
              if (l.fromKind === "node") {
                const source = nodeById.get(l.fromId);
                if (source) {
                  const p = posOf(source);
                  sp = { x: p.x + NODE_W, y: p.y + 90 };
                }
              } else {
                const m = allMedia.find((x) => x.id === l.fromId);
                if (m) {
                  const p = mediaNodePos(m);
                  if (p) sp = { x: p.x + NODE_W, y: p.y + 160 };
                }
              }
              if (!sp) return null;
              const start: { x: number; y: number } = sp;
              return (
                <path
                  key={l.id}
                  d={`M ${start.x} ${start.y} C ${start.x + 60} ${start.y}, ${tp.x - 60} ${tp.y + 90}, ${tp.x} ${tp.y + 90}`}
                  fill="none"
                  stroke="#b97f1e"
                  strokeWidth={2}
                  strokeDasharray={l.kind === "start_frame" ? "6 4" : undefined}
                />
              );
            })}
          </svg>
          {nodes.map((n) => {
            const p = posOf(n);
            return (
              <div
                key={n.id}
                className="absolute"
                style={{ left: p.x, top: p.y, width: NODE_W, height: 430 }}
              >
                {renderNode(n, onHeaderPointerDown)}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Zoom canvas out"
          onClick={() =>
            setView((v) => ({ ...v, k: Math.max(0.4, +(v.k - 0.15).toFixed(2)) }))
          }
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
        >
          <ZoomOut className="h-4 w-4" aria-hidden />
        </button>
        <span className="text-xs text-[var(--dim)]">
          {Math.round(view.k * 100)}%
        </span>
        <button
          type="button"
          aria-label="Zoom canvas in"
          onClick={() =>
            setView((v) => ({ ...v, k: Math.min(1.6, +(v.k + 0.15).toFixed(2)) }))
          }
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
        >
          <ZoomIn className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setView({ x: 24, y: 24, k: 1 })}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
        >
          Reset view
        </button>
        <span className="ml-auto hidden text-xs text-[var(--dim)] sm:block">
          Drag a node's header to move it · drag the background to pan
        </span>
      </div>
    </div>
  );
}

function ChatPanel({
  projectId,
  messages,
  approvalMode,
  readOnly,
  onChanged,
  onReviewBible,
}: {
  projectId: number;
  messages: ChatMsg[];
  approvalMode: "ask" | "auto";
  readOnly: boolean;
  onChanged: () => void;
  onReviewBible: (drafts: BibleDraft) => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = useMutation({
    mutationFn: (text: string) => api.canvasChat({ projectId, text }),
    onSuccess: () => {
      setDraft("");
      onChanged();
    },
  });
  const apply = useMutation({
    mutationFn: (m: ChatMsg) => api.applyChatProposal({ messageId: m.id }),
    onSuccess: (_res, m) => {
      const proposal = parseProposal(m.proposal);
      if (proposal?.kind === "bible") {
        onReviewBible({
          characters: proposal.characters,
          locations: proposal.locations,
          sceneTags: [],
        });
      }
      onChanged();
    },
  });
  const dismiss = useMutation({
    mutationFn: (messageId: number) => api.dismissChatProposal({ messageId }),
    onSuccess: onChanged,
  });
  const setMode = useMutation({
    mutationFn: (mode: "ask" | "auto") =>
      api.setCanvasApprovalMode({ projectId, mode }),
    onSuccess: onChanged,
  });

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] lg:w-80 lg:shrink-0">
      <div className="border-b border-[var(--border)] px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <MessageSquare className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          Canvas assistant
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--dim)]">
          Ask about the film, or ask for a shot list, bible drafts, or images.
          Proposals create nothing until you approve them.
        </p>
        {!readOnly && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--dim)]">
              Approval mode
            </span>
            <div
              role="group"
              aria-label="Chat approval mode"
              className="flex overflow-hidden rounded-lg border border-[var(--border)]"
            >
              <button
                type="button"
                aria-pressed={approvalMode === "ask"}
                disabled={setMode.isPending}
                onClick={() => setMode.mutate("ask")}
                className={`px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  approvalMode === "ask"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg)]"
                }`}
              >
                Ask first
              </button>
              <button
                type="button"
                aria-pressed={approvalMode === "auto"}
                disabled={setMode.isPending}
                onClick={() => setMode.mutate("auto")}
                className={`px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  approvalMode === "auto"
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg)]"
                }`}
              >
                Auto
              </button>
            </div>
          </div>
        )}
        <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--dim)]">
          {approvalMode === "ask"
            ? "Ask first: image generations wait for your approval."
            : "Auto: image generations the assistant proposes run right away. Shot lists and bible drafts still wait for you."}
        </p>
      </div>

      <div
        ref={listRef}
        className="max-h-[420px] flex-1 space-y-3 overflow-y-auto px-3.5 py-3 lg:max-h-[520px]"
        aria-label="Chat history"
      >
        {messages.length === 0 && (
          <p className="text-sm leading-relaxed text-[var(--dim)]">
            Nothing here yet. Try: “Give me a shot list for the opening”, “Develop
            a rival character”, or “Generate an image of the storm hitting the
            harbor”.
          </p>
        )}
        {messages.map((m) => {
          const proposal = parseProposal(m.proposal);
          return (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--ink)] text-[#f6f3ec]"
                    : "border border-[var(--border)] bg-[var(--bg)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {proposal && m.role === "assistant" && (
                  <div className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--text)]">
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                      {proposal.kind === "shotlist"
                        ? `Proposed shot list — ${proposal.shots.length} scenes`
                        : proposal.kind === "bible"
                          ? "Proposed bible drafts"
                          : `Proposed images — ${proposal.imagePrompts.length}`}
                    </p>
                    {proposal.kind === "shotlist" && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-[var(--dim)]">
                        {proposal.shots.map((s, i) => (
                          <li key={i}>{s.title}</li>
                        ))}
                      </ul>
                    )}
                    {proposal.kind === "bible" && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-[var(--dim)]">
                        {proposal.characters.map((c, i) => (
                          <li key={`c${i}`}>Character: {c.name}</li>
                        ))}
                        {proposal.locations.map((l, i) => (
                          <li key={`l${i}`}>Location: {l.name}</li>
                        ))}
                      </ul>
                    )}
                    {proposal.kind === "images" && (
                      <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-[var(--dim)]">
                        {proposal.imagePrompts.map((p, i) => (
                          <li key={i} className="line-clamp-2">
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.proposalStatus === "pending" && !readOnly && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={apply.isPending}
                          onClick={() => apply.mutate(m)}
                          className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          {apply.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {proposal.kind === "shotlist"
                            ? "Add scenes to storyboard"
                            : proposal.kind === "bible"
                              ? "Review in the Bible"
                              : "Generate these images"}
                        </button>
                        <button
                          type="button"
                          disabled={dismiss.isPending}
                          onClick={() => dismiss.mutate(m.id)}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    {m.proposalStatus === "applied" && (
                      <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-700">
                        <Check className="h-3.5 w-3.5" aria-hidden /> Applied
                      </p>
                    )}
                    {m.proposalStatus === "in_review" && (
                      <p className="mt-2 text-xs font-semibold text-[var(--accent)]">
                        Sent to the Bible review panel — add the drafts you
                        like there.
                      </p>
                    )}
                    {m.proposalStatus === "dismissed" && (
                      <p className="mt-2 text-xs font-medium text-[var(--dim)]">
                        Dismissed
                      </p>
                    )}
                    {apply.isError && (
                      <p className="mt-2 text-xs text-red-700">
                        That proposal didn't apply. Try again.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {send.isPending && (
          <p className="flex items-center gap-2 text-xs text-[var(--dim)]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Thinking — this can take a few seconds…
          </p>
        )}
        {send.isError && (
          <p className="text-xs text-red-700">
            The assistant didn't answer. Try again in a moment.
          </p>
        )}
      </div>

      {!readOnly && (
        <form
          className="flex items-end gap-2 border-t border-[var(--border)] px-3 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (text) send.mutate(text);
          }}
        >
          <label htmlFor="canvas-chat-input" className="sr-only">
            Message the canvas assistant
          </label>
          <textarea
            id="canvas-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ask for a shot list, a character, an image…"
            className="min-w-0 flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send chat message"
            disabled={!draft.trim() || send.isPending}
            className="rounded-lg bg-[var(--ink)] p-2.5 text-[#f6f3ec] disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}

function SectionBar({
  sections,
  counts,
  readOnly,
  onChanged,
}: {
  sections: CanvasSection[];
  counts: Map<number, number>;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const update = useMutation({
    mutationFn: (args: { sectionId: number; name?: string; collapsed?: boolean }) =>
      api.updateCanvasSection(args),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: (sectionId: number) => api.deleteCanvasSection({ sectionId }),
    onSuccess: onChanged,
  });

  if (sections.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Canvas sections">
      {sections.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-3 pr-1.5"
        >
          <button
            type="button"
            aria-label={`${s.collapsed ? "Expand" : "Collapse"} section ${s.name}`}
            aria-expanded={!s.collapsed}
            onClick={() =>
              update.mutate({ sectionId: s.id, collapsed: !s.collapsed })
            }
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${s.collapsed ? "-rotate-90" : ""}`}
              aria-hidden
            />
            {s.name}
            <span className="font-medium normal-case tracking-normal text-[var(--dim)]">
              {counts.get(s.id) ?? 0}
            </span>
          </button>
          {!readOnly && editingId === s.id ? (
            <>
              <label htmlFor={`section-name-${s.id}`} className="sr-only">
                Rename section {s.name}
              </label>
              <input
                id={`section-name-${s.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
                className="w-28 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs focus:outline-none"
              />
              <button
                type="button"
                aria-label={`Save section name ${editName}`}
                disabled={!editName.trim() || update.isPending}
                onClick={() =>
                  update.mutate(
                    { sectionId: s.id, name: editName.trim() },
                    { onSuccess: () => setEditingId(null) },
                  )
                }
                className="rounded-md bg-[var(--accent)] p-1.5 text-white disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          ) : (
            !readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`Rename section ${s.name}`}
                  onClick={() => {
                    setEditingId(s.id);
                    setEditName(s.name);
                  }}
                  className="rounded-full p-1.5 text-[var(--dim)]"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                {confirmDeleteId === s.id ? (
                  <button
                    type="button"
                    aria-label={`Confirm delete section ${s.name}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(s.id)}
                    className="rounded-full bg-red-700 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                  >
                    Delete?
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete section ${s.name}`}
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="rounded-full p-1.5 text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </>
            )
          )}
        </div>
      ))}
    </div>
  );
}

function CanvasPanel({
  projectId,
  readOnly,
  characters,
  locations,
  scenes,
  onChanged,
  onReviewBible,
}: {
  projectId: number;
  readOnly: boolean;
  characters: Character[];
  locations: FilmLocation[];
  scenes: Scene[];
  onChanged: () => void;
  onReviewBible: (drafts: BibleDraft) => void;
}) {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: ["canvas", projectId],
    queryFn: () => api.getCanvas({ projectId }),
  });
  const [chatOpen, setChatOpen] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [targetSectionId, setTargetSectionId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const invalidateCanvas = () => {
    void queryClient.invalidateQueries({ queryKey: ["canvas", projectId] });
  };
  const changed = () => {
    invalidateCanvas();
    onChanged();
  };

  const addNode = useMutation({
    mutationFn: (type: "note" | "image" | "clip") =>
      api.addCanvasNode({
        projectId,
        type,
        sectionId: targetSectionId,
      }),
    onSuccess: changed,
  });
  const addSection = useMutation({
    mutationFn: (name: string) =>
      api.addCanvasSection({ projectId, name }),
    onSuccess: () => {
      setNewSectionName("");
      changed();
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const enc = await fileToBase64(file);
      return api.uploadCanvasImage({
        projectId,
        sectionId: targetSectionId,
        name: file.name,
        dataBase64: enc.dataBase64,
        mimeType: enc.mimeType,
      });
    },
    onSuccess: changed,
    onError: () =>
      setUploadError("That upload didn't work — use a JPEG, PNG, WebP, or GIF image."),
  });

  const canvas = data.data;
  const sections = canvas?.sections ?? [];
  // Default new-node target: the SHOTS section when there is one.
  useEffect(() => {
    if (targetSectionId === null && sections.length > 0) {
      const shots = sections.find((s) => s.name.toUpperCase() === "SHOTS");
      setTargetSectionId((shots ?? sections[0])?.id ?? null);
    }
  }, [sections, targetSectionId]);

  if (readOnly) {
    return (
      <section className="mt-12">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <LayoutGrid className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Canvas
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
          Sample films are read-only — open one of your own films to work on
          its canvas.
        </p>
      </section>
    );
  }

  const nodes = canvas?.nodes ?? [];
  const allMedia = canvas?.media ?? [];
  const links = canvas?.links ?? [];
  const collapsedIds = new Set(
    sections.filter((s) => s.collapsed).map((s) => s.id),
  );
  const visibleNodes = nodes.filter(
    (n) => n.sectionId === null || !collapsedIds.has(n.sectionId),
  );
  const visibleMedia = (list: MediaItem[]) =>
    showArchived ? list : list.filter((m) => !m.archived);
  const mediaForNode = (nodeId: number) =>
    visibleMedia(allMedia.filter((m) => m.nodeId === nodeId));
  const orphanMedia = visibleMedia(allMedia.filter((m) => m.nodeId === null));
  const counts = new Map<number, number>();
  for (const n of nodes) {
    if (n.sectionId !== null) {
      counts.set(n.sectionId, (counts.get(n.sectionId) ?? 0) + 1);
    }
  }
  const binItems = allMedia.filter((m) => m.inEditorBin && !m.archived);
  const archivedCount = allMedia.filter((m) => m.archived).length;

  const renderNodeCard = (
    node: CanvasNode,
    boardMode: boolean,
    headerPointerDown?: (e: ReactPointerEvent, n: CanvasNode) => void,
  ) => (
    <NodeCard
      projectId={projectId}
      node={node}
      media={mediaForNode(node.id)}
      allNodes={nodes}
      allMedia={allMedia}
      links={links}
      sections={sections}
      characters={characters}
      locations={locations}
      scenes={scenes}
      readOnly={readOnly}
      boardMode={boardMode}
      onChanged={changed}
      onHeaderPointerDown={headerPointerDown}
    />
  );

  return (
    <section className="relative left-1/2 mt-12 w-[min(97vw,1280px)] -translate-x-1/2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <LayoutGrid className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Canvas
        </h2>
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          aria-expanded={chatOpen}
          className="ml-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium"
        >
          <MessageSquare className="h-4 w-4" aria-hidden />
          {chatOpen ? "Hide assistant" : "Show assistant"}
        </button>
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
        The working board for this film: notes, generated stills, and motion
        clips, grouped in sections and wired together. Voice, Music, and
        Emotion nodes are in the Add node menu — they're aggregator models,
        honestly locked until an aggregator key is saved in Account →
        Integrations.
      </p>

      {data.isPending && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--dim)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Rolling out the canvas…
        </p>
      )}
      {data.isError && (
        <p className="mt-4 text-sm text-red-700">
          The canvas couldn't be loaded. Try again in a moment.
        </p>
      )}

      {canvas && (
        <>
          {!readOnly && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Add node</span>
              <button
                type="button"
                disabled={addNode.isPending}
                onClick={() => addNode.mutate("note")}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                <StickyNote className="h-4 w-4" aria-hidden />
                Text note
              </button>
              <button
                type="button"
                disabled={addNode.isPending}
                onClick={() => addNode.mutate("image")}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" aria-hidden />
                Generate image
              </button>
              <button
                type="button"
                disabled={addNode.isPending}
                onClick={() => addNode.mutate("clip")}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                <Video className="h-4 w-4" aria-hidden />
                Frame to clip
              </button>
              <button
                type="button"
                disabled
                title="Aggregator model — locked until an aggregator key is saved in Account → Integrations"
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium opacity-60"
              >
                <AudioLines className="h-4 w-4" aria-hidden />
                Generate voice · Locked — Needs aggregator key
              </button>
              <button
                type="button"
                disabled
                title="Aggregator model — locked until an aggregator key is saved in Account → Integrations"
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium opacity-60"
              >
                <AudioLines className="h-4 w-4" aria-hidden />
                Generate music · Locked — Needs aggregator key
              </button>
              <button
                type="button"
                disabled
                title="Aggregator model — locked until an aggregator key is saved in Account → Integrations"
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium opacity-60"
              >
                <AudioLines className="h-4 w-4" aria-hidden />
                Emotion · Locked — Needs aggregator key
              </button>
              <button
                type="button"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                {upload.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4" aria-hidden />
                )}
                Upload image
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                aria-label="Upload an image to the canvas"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    setUploadError(null);
                    upload.mutate(file);
                  }
                }}
              />
              <label
                htmlFor="canvas-target-section"
                className="ml-1 text-xs font-medium text-[var(--dim)]"
              >
                into
              </label>
              <select
                id="canvas-target-section"
                value={targetSectionId ?? ""}
                onChange={(e) =>
                  setTargetSectionId(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm focus:outline-none"
              >
                <option value="">No section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newSectionName.trim())
                    addSection.mutate(newSectionName.trim());
                }}
              >
                <label htmlFor="new-section-name" className="sr-only">
                  New section name
                </label>
                <input
                  id="new-section-name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  maxLength={60}
                  placeholder="New section…"
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newSectionName.trim() || addSection.isPending}
                  className="flex items-center gap-1 rounded-lg bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Section
                </button>
              </form>
              {archivedCount > 0 && (
                <button
                  type="button"
                  aria-pressed={showArchived}
                  onClick={() => setShowArchived((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium"
                >
                  {showArchived ? (
                    <Eye className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                  {showArchived ? "Hide" : "Show"} archived ({archivedCount})
                </button>
              )}
            </div>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-red-700">{uploadError}</p>
          )}
          {addNode.isError && (
            <p className="mt-2 text-sm text-red-700">
              That node didn't get added. Try again.
            </p>
          )}

          <div className="mt-4">
            <SectionBar
              sections={sections}
              counts={counts}
              readOnly={readOnly}
              onChanged={changed}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              {/* Board on wider screens; the same nodes stack below on phones. */}
              <div className="hidden md:block">
                <CanvasBoard
                  sections={sections.filter((s) => !s.collapsed)}
                  nodes={visibleNodes}
                  links={links}
                  allMedia={allMedia}
                  renderNode={(node, headerPointerDown) =>
                    renderNodeCard(node, true, headerPointerDown)
                  }
                />
              </div>
              <div className="space-y-6 md:hidden">
                <p className="text-xs leading-relaxed text-[var(--dim)]">
                  On a phone the canvas stacks into its sections — same nodes,
                  same actions, no dragging. Open it on a wider screen for the
                  free-form board.
                </p>
                {sections
                  .filter((s) => !s.collapsed)
                  .map((s) => {
                    const members = visibleNodes.filter(
                      (n) => n.sectionId === s.id,
                    );
                    if (members.length === 0) return null;
                    return (
                      <div key={s.id}>
                        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                          {s.name}
                        </h3>
                        <div className="mt-2 space-y-3">
                          {members.map((n) => (
                            <div key={n.id}>{renderNodeCard(n, false)}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                {visibleNodes.filter((n) => n.sectionId === null).length >
                  0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                      No section
                    </h3>
                    <div className="mt-2 space-y-3">
                      {visibleNodes
                        .filter((n) => n.sectionId === null)
                        .map((n) => (
                          <div key={n.id}>{renderNodeCard(n, false)}</div>
                        ))}
                    </div>
                  </div>
                )}
                {visibleNodes.length === 0 && (
                  <p className="text-sm text-[var(--dim)]">
                    No nodes yet — add a text note or a generate-image node
                    above to start the board.
                  </p>
                )}
              </div>

              {orphanMedia.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold">Unattached media</h3>
                  <p className="mt-0.5 text-xs text-[var(--dim)]">
                    Media whose node was deleted — still part of this
                    project's assets.
                  </p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {orphanMedia.map((m) => (
                      <MediaItemCard
                        key={m.id}
                        item={m}
                        readOnly={readOnly}
                        scenes={scenes}
                        onChanged={changed}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Film className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                  Editor bin — {binItems.length}{" "}
                  {binItems.length === 1 ? "item" : "items"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--dim)]">
                  {binItems.length > 0
                    ? `Waiting in the Editor's Assets tab: ${binItems.map((m) => m.name).join(" · ")}`
                    : "Nothing flagged yet. Use “Editor bin” on any media item to line it up in the video editor's Assets tab, below."}
                </p>
              </div>
            </div>

            {chatOpen && (
              <ChatPanel
                projectId={projectId}
                messages={canvas.chat}
                approvalMode={canvas.approvalMode}
                readOnly={readOnly}
                onChanged={changed}
                onReviewBible={onReviewBible}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------------------------- Stage (Stage 6) ---------------------------- */
//
// The 3D Stage is a top-down blocking board: figures, cameras with a
// field-of-view cone, and props on a ground plane. The geometry below
// mirrors the server's (server/src/actions.ts) so the live shot
// description the user reads is the one "Send to canvas / storyboard"
// uses. It is a planning tool — no 3D rendering, no recording.

const SHOT_HALF_FOV: Record<ShotSize, number> = {
  wide: 35,
  medium: 25,
  close: 14,
};
const SHOT_SIZE_LABEL: Record<ShotSize, string> = {
  wide: "Wide shot",
  medium: "Medium shot",
  close: "Close-up",
};
const CAM_HEIGHT_PHRASE: Record<CamHeight, string> = {
  low: "from a low angle, looking up",
  eye: "at eye level",
  high: "from a high angle, looking down",
  overhead: "from directly overhead, looking straight down",
};
const STAGE_COLORS = [
  "#b3543f",
  "#3f6fb5",
  "#3f9155",
  "#8a5fb5",
  "#b58a3f",
  "#3fa8a0",
  "#b53f78",
  "#6b7280",
];
const PROP_PRESETS = [
  "Table",
  "Door",
  "Car",
  "Tree",
  "Chair",
  "Bed",
  "Counter",
  "Desk",
  "Fence",
  "Lamp post",
];

function stageItemLabel(item: StageItem): string {
  return item.characterName ?? item.label;
}

type FramedThing = {
  item: StageItem;
  side: "frame left" | "center frame" | "frame right";
  depth: "foreground" | "mid-ground" | "background";
  dist: number;
  angleRatio: number;
};

function stageFrameContents(
  camera: StageItem,
  items: StageItem[],
): { figures: FramedThing[]; props: FramedThing[] } {
  const rad = (camera.rotation * Math.PI) / 180;
  const fx = Math.sin(rad);
  const fy = -Math.cos(rad);
  const rx = Math.cos(rad);
  const ry = Math.sin(rad);
  const halfFov = SHOT_HALF_FOV[camera.shotSize ?? "wide"];
  const figures: FramedThing[] = [];
  const props: FramedThing[] = [];
  for (const item of items) {
    if (item.id === camera.id || item.kind === "camera") continue;
    const dx = item.x - camera.x;
    const dy = item.y - camera.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) continue;
    const forward = dx * fx + dy * fy;
    if (forward <= 0) continue;
    const angleDeg =
      (Math.acos(Math.min(1, Math.max(-1, forward / dist))) * 180) / Math.PI;
    if (angleDeg > halfFov) continue;
    const lateral = dx * rx + dy * ry;
    const ratio = lateral / dist;
    const side =
      ratio < -0.28
        ? "frame left"
        : ratio > 0.28
          ? "frame right"
          : "center frame";
    const depth =
      dist < 24 ? "foreground" : dist > 52 ? "background" : "mid-ground";
    const signedAngle =
      (Math.atan2(lateral, forward) * 180) / Math.PI;
    const entry: FramedThing = {
      item,
      side,
      depth,
      dist,
      angleRatio: Math.tan((signedAngle * Math.PI) / 180) /
        Math.tan((halfFov * Math.PI) / 180),
    };
    if (item.kind === "figure") figures.push(entry);
    else props.push(entry);
  }
  figures.sort((a, b) => a.dist - b.dist);
  props.sort((a, b) => a.dist - b.dist);
  return { figures, props };
}

function composeStageShot(camera: StageItem, items: StageItem[]): string {
  const size = SHOT_SIZE_LABEL[camera.shotSize ?? "wide"];
  const height = CAM_HEIGHT_PHRASE[camera.camHeight ?? "eye"];
  const { figures, props } = stageFrameContents(camera, items);
  const parts: string[] = [`${size}, ${height}.`];
  if (figures.length === 0) {
    parts.push("No characters are in frame from this camera.");
  } else {
    parts.push(
      `${figures
        .map(
          (f) =>
            `${stageItemLabel(f.item)} is at ${f.side}, in the ${f.depth}`,
        )
        .join("; ")}.`,
    );
  }
  if (props.length > 0) {
    parts.push(
      `Also visible: ${props
        .map((p) => `${stageItemLabel(p.item)} in the ${p.depth} at ${p.side}`)
        .join("; ")}.`,
    );
  }
  const move = camera.movementNote?.trim();
  if (move) parts.push(`Camera movement: ${move}.`);
  return parts.join(" ");
}

function effectiveStageShot(camera: StageItem, items: StageItem[]): string {
  const override = camera.descriptionOverride?.trim();
  return override ? override : composeStageShot(camera, items);
}

// The camera's-eye preview: in-frame figures and props projected onto a
// 16:9 frame (horizontal position from their angle, size from distance).
function StageCameraPreview({
  camera,
  items,
}: {
  camera: StageItem;
  items: StageItem[];
}) {
  const { figures, props } = stageFrameContents(camera, items);
  const all = [...props, ...figures].sort((a, b) => b.dist - a.dist);
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#101014]"
      aria-label={`Preview from ${camera.label}`}
    >
      <div className="absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-[#23232c] to-[#17171d]" />
      <div className="absolute inset-x-0 bottom-0 h-[54%] bg-gradient-to-b from-[#2c2620] to-[#1a1712]" />
      {all.map((f) => {
        const leftPct = 50 + Math.max(-1, Math.min(1, f.angleRatio)) * 44;
        const hPct = Math.max(14, Math.min(82, 2400 / f.dist));
        const bottomPct = Math.max(2, Math.min(30, f.dist * 0.32));
        if (f.item.kind === "prop") {
          return (
            <div
              key={f.item.id}
              className="absolute flex -translate-x-1/2 items-end justify-center"
              style={{
                left: `${leftPct}%`,
                bottom: `${bottomPct}%`,
                width: `${Math.max(8, hPct * 0.7)}%`,
                height: `${hPct * 0.45}%`,
              }}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-sm text-center"
                style={{ backgroundColor: f.item.color }}
              >
                <span className="px-1 text-[10px] font-semibold text-white">
                  {stageItemLabel(f.item)}
                </span>
              </div>
            </div>
          );
        }
        return (
          <div
            key={f.item.id}
            className="absolute flex -translate-x-1/2 flex-col items-center"
            style={{
              left: `${leftPct}%`,
              bottom: `${bottomPct}%`,
              height: `${hPct}%`,
            }}
          >
            <div
              className="flex h-full flex-col items-center justify-start"
              style={{ color: f.item.color }}
            >
              <PersonStanding
                style={{ height: "78%", width: "auto" }}
                strokeWidth={1.6}
                aria-hidden
              />
            </div>
            <span className="mt-0.5 max-w-24 truncate text-[10px] font-medium text-[#e8e2d4]">
              {stageItemLabel(f.item)}
            </span>
          </div>
        );
      })}
      {all.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-[#a49e90]">
          Nothing is in frame from this camera yet — move a figure into its
          cone on the board.
        </p>
      )}
      <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e8e2d4]">
        {camera.label} · {SHOT_SIZE_LABEL[camera.shotSize ?? "wide"]}
      </span>
    </div>
  );
}

function StagePanel({
  projectId,
  readOnly,
  characters,
  onChanged,
}: {
  projectId: number;
  readOnly: boolean;
  characters: Character[];
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: ["stage", projectId],
    queryFn: () => api.getStage({ projectId }),
  });
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeSetupId, setActiveSetupId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ id: number; x: number; y: number } | null>(null);
  const dragRef = useRef<{ id: number; moved: boolean } | null>(null);
  const boardTapRef = useRef<{ x: number; y: number } | null>(null);
  const [propPreset, setPropPreset] = useState(PROP_PRESETS[0] ?? "Table");
  const [propCustom, setPropCustom] = useState("");
  const [setupNameDraft, setSetupNameDraft] = useState<string | null>(null);
  const [confirmDeleteSetup, setConfirmDeleteSetup] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const [moveDraft, setMoveDraft] = useState<string | null>(null);
  const [rotDraft, setRotDraft] = useState<number | null>(null);

  const invalidateStage = () => {
    void queryClient.invalidateQueries({ queryKey: ["stage", projectId] });
  };
  const changed = () => {
    invalidateStage();
    onChanged();
  };

  const setups = data.data?.setups ?? [];
  const setup =
    setups.find((s) => s.id === activeSetupId) ?? setups[0] ?? null;
  useEffect(() => {
    if (setup && activeSetupId !== setup.id) setActiveSetupId(setup.id);
  }, [setup, activeSetupId]);
  const items = setup?.items ?? [];
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const cameras = items.filter((i) => i.kind === "camera");
  const placedCharIds = new Set(
    items
      .filter((i) => i.characterId !== null)
      .map((i) => i.characterId as number),
  );
  const unplacedCast = characters.filter((c) => !placedCharIds.has(c.id));

  const displayPos = (item: StageItem) =>
    dragPos && dragPos.id === item.id
      ? { x: dragPos.x, y: dragPos.y }
      : { x: item.x, y: item.y };
  const displayItems = items.map((item) => ({ ...item, ...displayPos(item) }));

  const updateItem = useMutation({
    mutationFn: (args: {
      itemId: number;
      x?: number;
      y?: number;
      rotation?: number;
      label?: string;
      color?: string;
      shotSize?: ShotSize;
      camHeight?: CamHeight;
      movementNote?: string | null;
      descriptionOverride?: string | null;
    }) => api.updateStageItem(args),
    onSuccess: invalidateStage,
  });
  const addSetup = useMutation({
    mutationFn: () => api.addStageSetup({ projectId }),
    onSuccess: (r) => {
      setActiveSetupId(r.setup.id);
      setSelectedId(null);
      changed();
    },
  });
  const renameSetup = useMutation({
    mutationFn: (name: string) =>
      api.renameStageSetup({ setupId: setup!.id, name }),
    onSuccess: changed,
  });
  const deleteSetup = useMutation({
    mutationFn: () => api.deleteStageSetup({ setupId: setup!.id }),
    onSuccess: () => {
      setActiveSetupId(null);
      setSelectedId(null);
      setConfirmDeleteSetup(false);
      changed();
    },
  });
  const addCast = useMutation({
    mutationFn: () => api.addStageCast({ setupId: setup!.id }),
    onSuccess: changed,
  });
  const addItem = useMutation({
    mutationFn: (args: { kind: "figure" | "camera" | "prop"; label?: string }) =>
      api.addStageItem({ setupId: setup!.id, ...args }),
    onSuccess: (r) => {
      setSelectedId(r.item.id);
      changed();
    },
  });
  const deleteItem = useMutation({
    mutationFn: (itemId: number) => api.deleteStageItem({ itemId }),
    onSuccess: () => {
      setSelectedId(null);
      changed();
    },
  });
  const sendToCanvas = useMutation({
    mutationFn: (cameraId: number) =>
      api.sendStageToCanvas({ setupId: setup!.id, cameraId }),
    onSuccess: (r) => {
      setSentNote(
        `Sent to the canvas — “${r.node.title}” is in the SHOTS section, ready to run.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["canvas", projectId] });
      onChanged();
    },
  });
  const sendToStoryboard = useMutation({
    mutationFn: (cameraId: number) =>
      api.sendStageToStoryboard({ setupId: setup!.id, cameraId }),
    onSuccess: (r) => {
      setSentNote(
        `Added to the storyboard as “${r.scene.title}” — scroll to the Storyboard section to film it.`,
      );
      onChanged();
    },
  });

  const boardPoint = (e: ReactPointerEvent): { x: number; y: number } | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    return {
      x: Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(3, Math.min(97, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const onItemPointerDown = (e: ReactPointerEvent, item: StageItem) => {
    if (readOnly) {
      setSelectedId(item.id);
      return;
    }
    e.stopPropagation();
    setSelectedId(item.id);
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    dragRef.current = { id: item.id, moved: false };
  };
  const onItemPointerMove = (e: ReactPointerEvent, item: StageItem) => {
    if (!dragRef.current || dragRef.current.id !== item.id) return;
    const p = boardPoint(e);
    if (!p) return;
    dragRef.current.moved = true;
    setDragPos({ id: item.id, x: p.x, y: p.y });
  };
  const onItemPointerUp = (item: StageItem) => {
    if (dragRef.current?.id === item.id && dragRef.current.moved && dragPos) {
      updateItem.mutate({ itemId: item.id, x: dragPos.x, y: dragPos.y });
    }
    dragRef.current = null;
    setDragPos(null);
  };

  const selectedCamera = selected?.kind === "camera" ? selected : null;
  const autoShot = selectedCamera
    ? composeStageShot(selectedCamera, displayItems)
    : "";
  const effectiveShot = selectedCamera
    ? effectiveStageShot(selectedCamera, displayItems)
    : "";

  if (data.isPending) {
    return (
      <section className="mt-12" aria-label="3D Stage">
        <h2 className="font-display text-2xl font-bold">Stage</h2>
        <p className="mt-3 flex items-center gap-2 text-sm text-[var(--dim)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Setting the stage…
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12" aria-label="3D Stage">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold">Stage</h2>
        <span className="text-sm text-[var(--dim)]">
          Block the scene from above — place your cast, props, and cameras,
          read the shot each camera gets, then send it to the canvas or the
          storyboard. A blocking and planning board: no 3D rendering and no
          recording.
        </span>
      </div>

      {readOnly ? (
        <p className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--dim)]">
          Sample films are read-only — the stage belongs to your own films.
        </p>
      ) : setups.length === 0 ? (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-5">
          <p className="text-sm">
            No setups yet. A setup is one staged layout — your cast and
            cameras on the ground plan of a scene.
          </p>
          <button
            type="button"
            onClick={() => addSetup.mutate()}
            disabled={addSetup.isPending}
            className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {addSetup.isPending ? "Creating…" : "Create the first setup"}
          </button>
          {addSetup.isError && (
            <p className="mt-2 text-sm text-red-700">
              That didn't work — try again.
            </p>
          )}
        </div>
      ) : (
        setup && (
          <>
            {/* Setup tabs + management */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {setups.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveSetupId(s.id);
                    setSelectedId(null);
                    setSentNote(null);
                  }}
                  aria-pressed={s.id === setup.id}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                    s.id === setup.id
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addSetup.mutate()}
                disabled={addSetup.isPending}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--border)] px-3.5 py-1.5 text-sm font-medium disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                New setup
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {setupNameDraft === null ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSetupNameDraft(setup.name)}
                    className="flex items-center gap-1.5 text-sm text-[var(--dim)] underline decoration-dotted underline-offset-2"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Rename “{setup.name}”
                  </button>
                  {confirmDeleteSetup ? (
                    <>
                      <span className="text-sm">Delete this setup?</span>
                      <button
                        type="button"
                        onClick={() => deleteSetup.mutate()}
                        disabled={deleteSetup.isPending}
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSetup(false)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                      >
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSetup(true)}
                      className="flex items-center gap-1.5 text-sm text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Delete setup
                    </button>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-2">
                  <label htmlFor="stage-setup-name" className="sr-only">
                    Setup name
                  </label>
                  <input
                    id="stage-setup-name"
                    value={setupNameDraft}
                    onChange={(e) => setSetupNameDraft(e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (setupNameDraft.trim()) renameSetup.mutate(setupNameDraft.trim());
                      setSetupNameDraft(null);
                    }}
                    className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-sm font-medium text-[#f6f3ec]"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupNameDraft(null)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </span>
              )}
            </div>

            {/* Add-items toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addCast.mutate()}
                disabled={addCast.isPending || unplacedCast.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
              >
                <Users className="h-4 w-4" aria-hidden />
                {characters.length === 0
                  ? "Add cast — no Bible characters yet"
                  : unplacedCast.length === 0
                    ? "Add cast — everyone is placed"
                    : `Add cast (${unplacedCast.length})`}
              </button>
              <button
                type="button"
                onClick={() => addItem.mutate({ kind: "figure" })}
                disabled={addItem.isPending}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium disabled:opacity-50"
              >
                <PersonStanding className="h-4 w-4" aria-hidden />
                Add figure
              </button>
              <button
                type="button"
                onClick={() => addItem.mutate({ kind: "camera" })}
                disabled={addItem.isPending}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium disabled:opacity-50"
              >
                <Camera className="h-4 w-4" aria-hidden />
                Add camera
              </button>
              <span className="flex items-center gap-2">
                <label htmlFor="stage-prop-preset" className="sr-only">
                  Prop to add
                </label>
                <select
                  id="stage-prop-preset"
                  value={propPreset}
                  onChange={(e) => setPropPreset(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm"
                >
                  {PROP_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <label htmlFor="stage-prop-custom" className="sr-only">
                  Custom prop label (optional)
                </label>
                <input
                  id="stage-prop-custom"
                  value={propCustom}
                  onChange={(e) => setPropCustom(e.target.value)}
                  placeholder="Custom label…"
                  className="w-32 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    addItem.mutate({
                      kind: "prop",
                      label: propCustom.trim() || propPreset,
                    });
                    setPropCustom("");
                  }}
                  disabled={addItem.isPending}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <Box className="h-4 w-4" aria-hidden />
                  Add prop
                </button>
              </span>
            </div>

            {/* The board */}
            <div
              ref={boardRef}
              role="application"
              aria-label={`Blocking board for ${setup.name}. Drag items to move them, or select an item and tap the board to place it.`}
              className="relative mt-4 aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-xl border border-[var(--border)] bg-[#22201b]"
              onPointerDown={(e) => {
                boardTapRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                const start = boardTapRef.current;
                boardTapRef.current = null;
                if (readOnly || !start || !selected) return;
                if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6)
                  return;
                if (dragRef.current) return;
                const p = boardPoint(e);
                if (p) updateItem.mutate({ itemId: selected.id, x: p.x, y: p.y });
              }}
            >
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(246,243,236,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(246,243,236,0.07) 1px, transparent 1px)",
                  backgroundSize: "10% 13.333%",
                }}
              />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 75"
                preserveAspectRatio="none"
                aria-hidden
              >
                {displayItems
                  .filter((i) => i.kind === "camera")
                  .map((cam) => {
                    const half = SHOT_HALF_FOV[cam.shotSize ?? "wide"];
                    const len = 36;
                    const ray = (deg: number) => {
                      const r = (deg * Math.PI) / 180;
                      return `${cam.x + Math.sin(r) * len},${cam.y * 0.75 - Math.cos(r) * len * 0.75}`;
                    };
                    return (
                      <polygon
                        key={cam.id}
                        points={`${cam.x},${cam.y * 0.75} ${ray(cam.rotation - half)} ${ray(cam.rotation + half)}`}
                        fill={cam.id === selectedId ? "rgba(232,196,118,0.28)" : "rgba(232,196,118,0.14)"}
                        stroke="rgba(232,196,118,0.45)"
                        strokeWidth="0.3"
                      />
                    );
                  })}
              </svg>
              <span className="pointer-events-none absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-widest text-[#a49e90]">
                Upstage
              </span>
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-[#a49e90]">
                Downstage · audience side
              </span>
              {displayItems.map((item) => {
                const isSel = item.id === selectedId;
                const facing = {
                  transform: `rotate(${item.rotation}deg)`,
                } as const;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.kind} ${stageItemLabel(item)} at ${Math.round(item.x)} percent across, ${Math.round(item.y)} percent down, facing ${Math.round(item.rotation)} degrees`}
                    aria-pressed={isSel}
                    className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center focus:outline-none ${
                      item.kind === "prop"
                        ? "h-10 w-16 rounded-md border px-1 text-center sm:h-11 sm:w-20"
                        : "h-11 w-11 rounded-full border-2 sm:h-12 sm:w-12"
                    } ${isSel ? "ring-2 ring-[#e8c476] ring-offset-2 ring-offset-[#22201b]" : ""}`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      backgroundColor:
                        item.kind === "camera" ? "#17171c" : item.color,
                      borderColor: "rgba(246,243,236,0.65)",
                      color: "#fff",
                      touchAction: "none",
                      zIndex: item.kind === "camera" ? 20 : 10,
                    }}
                    onPointerDown={(e) => onItemPointerDown(e, item)}
                    onPointerMove={(e) => onItemPointerMove(e, item)}
                    onPointerUp={() => onItemPointerUp(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }
                      if (!readOnly && (e.key.startsWith("Arrow"))) {
                        e.preventDefault();
                        const step = e.shiftKey ? 5 : 1.5;
                        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
                        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
                        updateItem.mutate({
                          itemId: item.id,
                          x: Math.max(2, Math.min(98, item.x + dx)),
                          y: Math.max(3, Math.min(97, item.y + dy)),
                        });
                      }
                    }}
                  >
                    {/* Facing tick */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={facing}
                    >
                      <span className="absolute left-1/2 top-[-7px] h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent border-b-[#e8c476]" />
                    </span>
                    {item.kind === "figure" && (
                      <PersonStanding className="h-6 w-6" aria-hidden />
                    )}
                    {item.kind === "camera" && (
                      <Camera className="h-5 w-5" aria-hidden />
                    )}
                    {item.kind === "prop" && (
                      <span className="text-[11px] font-semibold leading-tight">
                        {stageItemLabel(item)}
                      </span>
                    )}
                  </div>
                );
              })}
              {displayItems.map((item) =>
                item.kind === "prop" ? null : (
                  <span
                    key={`label-${item.id}`}
                    className="pointer-events-none absolute max-w-28 -translate-x-1/2 truncate rounded bg-black/55 px-1.5 py-0.5 text-center text-[10px] font-medium text-[#f6f3ec]"
                    style={{
                      left: `${item.x}%`,
                      top: `calc(${item.y}% + 30px)`,
                    }}
                  >
                    {stageItemLabel(item)}
                  </span>
                ),
              )}
              {items.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#a49e90]">
                  Empty stage. Add the cast, a camera, and a prop or two to
                  start blocking.
                </p>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--dim)]">
              Drag to move — or tap an item to select it, then tap the board
              to place it there. The yellow triangle is the way each piece
              faces; the pale cone is what a camera sees.
            </p>

            {/* Camera chips */}
            {cameras.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Cameras in this setup">
                {cameras.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setSelectedId(cam.id)}
                    aria-pressed={selectedId === cam.id}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                      selectedId === cam.id
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <Camera className="h-4 w-4" aria-hidden />
                    {cam.label} · {SHOT_SIZE_LABEL[cam.shotSize ?? "wide"]}
                  </button>
                ))}
              </div>
            )}

            {/* Selected item editor */}
            {selected && (
              <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">
                    {selected.kind === "figure" &&
                      (selected.characterName
                        ? `${selected.characterName} — cast figure`
                        : `${selected.label} — figure`)}
                    {selected.kind === "camera" && `${selected.label} — camera`}
                    {selected.kind === "prop" && `${selected.label} — prop`}
                  </h3>
                  <button
                    type="button"
                    onClick={() => deleteItem.mutate(selected.id)}
                    disabled={deleteItem.isPending}
                    className="flex items-center gap-1.5 text-sm text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </button>
                </div>
                {selected.kind === "figure" && !selected.characterName && (
                  <p className="mt-1 text-xs text-[var(--dim)]">
                    Generic figure — not linked to a Bible character.
                  </p>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <span>
                    <label htmlFor="stage-item-label" className="text-xs font-medium text-[var(--dim)]">
                      Label
                    </label>
                    <input
                      id="stage-item-label"
                      value={labelDraft ?? selected.label}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onBlur={() => {
                        if (labelDraft !== null && labelDraft.trim()) {
                          updateItem.mutate({ itemId: selected.id, label: labelDraft.trim() });
                        }
                        setLabelDraft(null);
                      }}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                    />
                  </span>
                  <span>
                    <span className="text-xs font-medium text-[var(--dim)]">
                      Facing — {Math.round(rotDraft ?? selected.rotation)}°
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={359}
                        value={rotDraft ?? Math.round(selected.rotation)}
                        aria-label={`Facing direction for ${stageItemLabel(selected)}`}
                        onChange={(e) => setRotDraft(Number(e.target.value))}
                        onPointerUp={() => {
                          if (rotDraft !== null) updateItem.mutate({ itemId: selected.id, rotation: rotDraft });
                          setRotDraft(null);
                        }}
                        onBlur={() => {
                          if (rotDraft !== null) updateItem.mutate({ itemId: selected.id, rotation: rotDraft });
                          setRotDraft(null);
                        }}
                        className="w-full"
                      />
                      <button
                        type="button"
                        aria-label="Rotate 45 degrees clockwise"
                        onClick={() =>
                          updateItem.mutate({
                            itemId: selected.id,
                            rotation: (selected.rotation + 45) % 360,
                          })
                        }
                        className="rounded-lg border border-[var(--border)] p-2"
                      >
                        <RotateCw className="h-4 w-4" aria-hidden />
                      </button>
                    </span>
                  </span>
                </div>
                {(selected.kind === "figure" || selected.kind === "prop") && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Marker color">
                    {STAGE_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Set marker color ${c}`}
                        aria-pressed={selected.color === c}
                        onClick={() => updateItem.mutate({ itemId: selected.id, color: c })}
                        className={`h-7 w-7 rounded-full border ${selected.color === c ? "ring-2 ring-[var(--accent)] ring-offset-2" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
                {selectedCamera && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <span>
                        <label htmlFor="stage-shot-size" className="text-xs font-medium text-[var(--dim)]">
                          Shot size
                        </label>
                        <select
                          id="stage-shot-size"
                          value={selectedCamera.shotSize ?? "wide"}
                          onChange={(e) =>
                            updateItem.mutate({
                              itemId: selectedCamera.id,
                              shotSize: e.target.value as ShotSize,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        >
                          <option value="wide">Wide</option>
                          <option value="medium">Medium</option>
                          <option value="close">Close-up</option>
                        </select>
                      </span>
                      <span>
                        <label htmlFor="stage-cam-height" className="text-xs font-medium text-[var(--dim)]">
                          Camera height
                        </label>
                        <select
                          id="stage-cam-height"
                          value={selectedCamera.camHeight ?? "eye"}
                          onChange={(e) =>
                            updateItem.mutate({
                              itemId: selectedCamera.id,
                              camHeight: e.target.value as CamHeight,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        >
                          <option value="low">Low</option>
                          <option value="eye">Eye-level</option>
                          <option value="high">High</option>
                          <option value="overhead">Overhead</option>
                        </select>
                      </span>
                      <span>
                        <label htmlFor="stage-move-note" className="text-xs font-medium text-[var(--dim)]">
                          Movement note
                        </label>
                        <input
                          id="stage-move-note"
                          value={moveDraft ?? selectedCamera.movementNote ?? ""}
                          placeholder="e.g. slow push-in"
                          onChange={(e) => setMoveDraft(e.target.value)}
                          onBlur={() => {
                            if (moveDraft !== null) {
                              updateItem.mutate({
                                itemId: selectedCamera.id,
                                movementNote: moveDraft.trim() || null,
                              });
                            }
                            setMoveDraft(null);
                          }}
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                        />
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <StageCameraPreview camera={selectedCamera} items={displayItems} />
                      <div>
                        <h4 className="text-sm font-semibold">
                          Shot description
                          {selectedCamera.descriptionOverride ? (
                            <span className="ml-2 rounded-full bg-[#e8c476]/25 px-2 py-0.5 text-xs font-medium text-[#7a5a12]">
                              Edited by you
                            </span>
                          ) : (
                            <span className="ml-2 text-xs font-normal text-[var(--dim)]">
                              Composed live from the board
                            </span>
                          )}
                        </h4>
                        <label htmlFor="stage-shot-desc" className="sr-only">
                          Shot description for {selectedCamera.label}
                        </label>
                        <textarea
                          id="stage-shot-desc"
                          rows={5}
                          value={descDraft ?? effectiveShot}
                          onChange={(e) => setDescDraft(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm leading-relaxed"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={descDraft === null || updateItem.isPending}
                            onClick={() => {
                              if (descDraft !== null) {
                                updateItem.mutate({
                                  itemId: selectedCamera.id,
                                  descriptionOverride: descDraft,
                                });
                              }
                              setDescDraft(null);
                            }}
                            className="rounded-lg bg-[var(--ink)] px-3.5 py-2 text-sm font-medium text-[#f6f3ec] disabled:opacity-40"
                          >
                            Save description
                          </button>
                          {selectedCamera.descriptionOverride && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem.mutate({
                                  itemId: selectedCamera.id,
                                  descriptionOverride: null,
                                });
                                setDescDraft(null);
                              }}
                              className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-sm"
                            >
                              Reset to auto
                            </button>
                          )}
                        </div>
                        {descDraft === null && (
                          <p className="mt-2 text-xs text-[var(--dim)]">
                            Auto text right now: “{autoShot}”
                          </p>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => sendToCanvas.mutate(selectedCamera.id)}
                            disabled={sendToCanvas.isPending}
                            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" aria-hidden />
                            {sendToCanvas.isPending ? "Sending…" : "Send to canvas"}
                          </button>
                          <button
                            type="button"
                            onClick={() => sendToStoryboard.mutate(selectedCamera.id)}
                            disabled={sendToStoryboard.isPending}
                            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium disabled:opacity-50"
                          >
                            <Clapperboard className="h-4 w-4" aria-hidden />
                            {sendToStoryboard.isPending ? "Sending…" : "Send to storyboard"}
                          </button>
                        </div>
                        {(sendToCanvas.isError || sendToStoryboard.isError) && (
                          <p className="mt-2 text-sm text-red-700">
                            That send didn't work — try again.
                          </p>
                        )}
                        {sentNote && (
                          <p className="mt-2 flex items-start gap-1.5 text-sm text-green-800">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            {sentNote}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}

/* --------------------------- Editor (Stage 5) ---------------------------- */
//
// The cut player below is shared: the Editor preview and the Watch view
// both play through it, so what the user assembles in the editor is
// exactly what Watch (and FilmKit TV, via Watch) shows once a cut is
// exported. Effects are honest look presets: CSS filters and overlays
// applied to the still at playback — nothing is re-rendered or faked.

const EFFECT_META: Record<
  EffectKey,
  { label: string; blurb: string; filter: string }
> = {
  none: { label: "None", blurb: "The shot as filmed.", filter: "" },
  warm: {
    label: "Warm",
    blurb: "Golden, sun-baked warmth.",
    filter: "sepia(0.35) saturate(1.3) hue-rotate(-10deg) brightness(1.06) contrast(1.02)",
  },
  cold: {
    label: "Cold",
    blurb: "A blue, detached chill.",
    filter: "saturate(0.75) hue-rotate(14deg) brightness(1.04) contrast(1.06)",
  },
  noir: {
    label: "Noir",
    blurb: "Black & white with hard contrast.",
    filter: "grayscale(1) contrast(1.4) brightness(0.94)",
  },
  grain: {
    label: "Grain",
    blurb: "Living film grain over the frame.",
    filter: "contrast(1.08) saturate(0.9) brightness(1.02)",
  },
  vhs: {
    label: "VHS",
    blurb: "Tape scanlines and hot, saturated colour.",
    filter: "saturate(1.5) contrast(1.12) brightness(1.05)",
  },
  bloom: {
    label: "Bloom",
    blurb: "Soft, glowing highlights.",
    filter: "brightness(1.14) contrast(0.9) saturate(1.2)",
  },
  vignette: {
    label: "Vignette",
    blurb: "The edges fall away into shadow.",
    filter: "brightness(0.98) contrast(1.05) saturate(1.05)",
  },
  posterize: {
    label: "Posterize",
    blurb: "Flattened, graphic colour bands.",
    filter: "url(#fk-posterize) saturate(1.25) contrast(1.05)",
  },
};
const EFFECT_ORDER: EffectKey[] = [
  "none",
  "warm",
  "cold",
  "noir",
  "grain",
  "vhs",
  "bloom",
  "vignette",
  "posterize",
];

const TRANSITION_META: Record<TransitionKey, { label: string; blurb: string }> = {
  cut: { label: "Cut", blurb: "A straight cut — no blend." },
  dissolve: { label: "Cross dissolve", blurb: "The shots melt into each other." },
  fade_black: { label: "Fade through black", blurb: "A dip through black between shots." },
  wipe: { label: "Wipe", blurb: "The next shot wipes in from the right." },
};
const TRANSITION_ORDER: TransitionKey[] = [
  "cut",
  "dissolve",
  "fade_black",
  "wipe",
];

const MOTION_META: Record<TextMotion, { label: string }> = {
  none: { label: "No motion" },
  fade_rise: { label: "Fade rise" },
  typewriter: { label: "Typewriter" },
  slam: { label: "Slam" },
  credit_roll: { label: "Credit roll" },
};
const MOTION_ORDER: TextMotion[] = [
  "none",
  "fade_rise",
  "typewriter",
  "slam",
  "credit_roll",
];

const TEXT_KIND_LABEL: Record<TextKind, string> = {
  title: "Title card",
  lower_third: "Lower third",
  caption: "Caption",
};

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type CutClipLike = {
  key: string;
  title: string;
  imageUrl: string | null;
  duration: number;
  effect: EffectKey;
  transition: TransitionKey;
  isMotionClip: boolean;
};
type CutAudioLike = {
  id: number;
  name: string;
  audioUrl: string;
  volume: number;
  start: number;
};

function EffectOverlay({ effect }: { effect: EffectKey }) {
  if (effect === "grain") {
    return (
      <div
        aria-hidden
        className="grain-overlay pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
      />
    );
  }
  if (effect === "vhs") {
    return (
      <>
        <div
          aria-hidden
          className="vhs-lines pointer-events-none absolute inset-0 opacity-70"
        />
        <div
          aria-hidden
          className="vhs-bar pointer-events-none absolute inset-x-0 h-10 bg-white/10 blur-[2px]"
        />
      </>
    );
  }
  if (effect === "vignette") {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    );
  }
  return null;
}

function CutTextOverlay({
  item,
  local,
}: {
  item: EditText;
  local: number;
}) {
  const motionClass =
    item.motion === "fade_rise"
      ? "txt-rise"
      : item.motion === "slam"
        ? "txt-slam"
        : item.motion === "credit_roll"
          ? "txt-roll"
          : "";
  const rollStyle =
    item.motion === "credit_roll"
      ? { animationDuration: `${item.duration}s` }
      : undefined;
  let shown = item.text;
  if (item.motion === "typewriter") {
    const n = Math.min(item.text.length, Math.floor(local / 0.055) + 1);
    shown = item.text.slice(0, n);
  }
  const caret =
    item.motion === "typewriter" ? (
      <span aria-hidden className="animate-pulse">
        |
      </span>
    ) : null;
  if (item.kind === "caption") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[7%] flex justify-center px-4">
        <span
          className={`max-w-[88%] rounded bg-black/70 px-3 py-1.5 text-center text-sm leading-snug text-white sm:text-base ${motionClass}`}
          style={rollStyle}
        >
          {shown}
          {caret}
        </span>
      </div>
    );
  }
  if (item.kind === "lower_third") {
    return (
      <div className="pointer-events-none absolute bottom-[13%] left-[5%] max-w-[80%]">
        <div
          className={`border-l-4 border-[#e8c476] bg-black/55 px-4 py-2 ${motionClass}`}
          style={rollStyle}
        >
          <p className="text-base font-semibold text-white sm:text-xl">
            {shown}
            {caret}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-6">
      <p
        className={`font-display text-center text-3xl font-black leading-tight text-white sm:text-5xl ${motionClass}`}
        style={{ textShadow: "0 2px 24px rgba(0,0,0,0.65)", ...rollStyle }}
      >
        {shown}
        {caret}
      </p>
    </div>
  );
}

function CutPlayer({
  clips,
  texts,
  audio,
}: {
  clips: CutClipLike[];
  texts: EditText[];
  audio: CutAudioLike[];
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [prev, setPrev] = useState<{
    clip: CutClipLike;
    kind: TransitionKey;
  } | null>(null);
  const [captionsOn, setCaptionsOn] = useState(true);
  const audioEls = useRef(new Map<number, HTMLAudioElement>());
  const interacted = useRef(false);
  const lock = useRef(false);
  const timers = useRef<number[]>([]);
  const globalTimeRef = useRef(0);

  const total = clips.reduce((a, c) => a + c.duration, 0);
  const safeIndex = Math.min(index, Math.max(clips.length - 1, 0));
  const clip = clips[safeIndex];
  const before = clips
    .slice(0, safeIndex)
    .reduce((a, c) => a + c.duration, 0);
  const globalTime = before + elapsed;
  globalTimeRef.current = globalTime;

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const syncAudio = (play: boolean, atTime?: number) => {
    if (!interacted.current) return;
    const t = atTime ?? globalTimeRef.current;
    for (const a of audio) {
      const el = audioEls.current.get(a.id);
      if (!el) continue;
      el.volume = a.volume;
      if (play && t >= a.start && t < total) {
        const target = t - a.start;
        if (Math.abs(el.currentTime - target) > 1.5) {
          try {
            el.currentTime = target;
          } catch {
            // Not seekable yet — it will start from the top.
          }
        }
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
  };

  const advance = () => {
    if (lock.current) return;
    const nextIdx = safeIndex + 1;
    const next = clips[nextIdx];
    if (!next) {
      setEnded(true);
      setPlaying(false);
      syncAudio(false);
      return;
    }
    if (next.transition === "fade_black") {
      lock.current = true;
      setBlackout(true);
      later(() => {
        setPrev(null);
        setIndex(nextIdx);
        setElapsed(0);
        later(() => {
          setBlackout(false);
          lock.current = false;
        }, 90);
      }, 340);
    } else {
      if (next.transition === "dissolve" || next.transition === "wipe") {
        const cur = clips[safeIndex];
        if (cur) setPrev({ clip: cur, kind: next.transition });
        later(() => setPrev(null), 730);
      }
      setIndex(nextIdx);
      setElapsed(0);
    }
  };

  useEffect(() => {
    if (!playing || ended || clips.length === 0) return;
    const iv = window.setInterval(() => {
      setElapsed((e) => e + 0.05);
    }, 50);
    return () => window.clearInterval(iv);
  }, [playing, ended, safeIndex, clips.length]);

  useEffect(() => {
    if (!playing || ended) return;
    const c = clips[safeIndex];
    if (c && elapsed >= c.duration) advance();
  });

  const goTo = (i: number) => {
    interacted.current = true;
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    lock.current = false;
    const target = Math.max(0, Math.min(i, clips.length - 1));
    setPrev(null);
    setBlackout(false);
    setIndex(target);
    setElapsed(0);
    setEnded(false);
    setPlaying(true);
    const startAt = clips
      .slice(0, target)
      .reduce((a, c) => a + c.duration, 0);
    later(() => syncAudio(true, startAt), 40);
  };

  const togglePlay = () => {
    interacted.current = true;
    if (ended) {
      goTo(0);
      return;
    }
    const next = !playing;
    setPlaying(next);
    syncAudio(next);
  };

  if (clips.length === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[var(--radius)] bg-black px-6 text-center">
        <Film className="h-10 w-10 text-[#57534a]" aria-hidden />
        <p className="text-sm text-[#a49e90]">
          Nothing on the timeline yet — add clips from the library and the
          preview plays here.
        </p>
      </div>
    );
  }

  const activeTexts = ended
    ? []
    : texts.filter(
        (t) =>
          (t.kind !== "caption" || captionsOn) &&
          globalTime >= t.start &&
          globalTime < t.start + t.duration,
      );

  return (
    <div>
      {/* SVG posterize filter the posterize look preset points at. */}
      <svg aria-hidden className="hidden">
        <defs>
          <filter id="fk-posterize">
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0 0.25 0.5 0.75 1" />
              <feFuncG type="table" tableValues="0 0.25 0.5 0.75 1" />
              <feFuncB type="table" tableValues="0 0.25 0.5 0.75 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black">
        {prev && prev.clip.imageUrl && (
          <img
            src={prev.clip.imageUrl}
            alt=""
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover ${
              prev.kind === "dissolve" ? "cut-prev-fade" : ""
            }`}
            style={{ filter: EFFECT_META[prev.clip.effect].filter }}
          />
        )}
        {clip && !ended && (
          <>
            {clip.imageUrl ? (
              <img
                key={clip.key}
                src={clip.imageUrl}
                alt={`Clip: ${clip.title}`}
                className={`absolute inset-0 h-full w-full object-cover ${
                  safeIndex % 2 === 0 ? "kb-a" : "kb-b"
                } ${
                  prev && clip.transition === "dissolve"
                    ? "cut-in-dissolve"
                    : prev && clip.transition === "wipe"
                      ? "cut-in-wipe"
                      : ""
                }`}
                style={{ filter: EFFECT_META[clip.effect].filter }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#17171c] px-6 text-center text-sm text-[#a49e90]">
                {clip.title} — its source image is gone, so this clip shows
                as a blank.
              </div>
            )}
            {clip.effect === "bloom" && clip.imageUrl && (
              <img
                src={clip.imageUrl}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
                style={{ filter: "blur(14px) brightness(1.35)" }}
              />
            )}
            <EffectOverlay effect={clip.effect} />
            <div className="absolute left-3 top-3 max-w-[70%] truncate rounded bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90">
              {clip.isMotionClip ? "Motion clip · " : ""}
              {clip.title}
            </div>
            {activeTexts.map((t) => (
              <CutTextOverlay key={t.id} item={t} local={globalTime - t.start} />
            ))}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-300 ${
                blackout ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        )}
        {ended && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="font-display text-4xl font-black italic text-white">
              The End
            </p>
            <button
              type="button"
              onClick={() => goTo(0)}
              className="mt-2 flex items-center gap-2 rounded-full bg-[#e8c476] px-5 py-2.5 text-sm font-semibold text-[#171205]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Watch again
            </button>
          </div>
        )}
      </div>

      {/* Progress segments */}
      <div
        className="mt-3 flex gap-1.5"
        role="progressbar"
        aria-label="Cut progress"
        aria-valuemin={0}
        aria-valuemax={clips.length}
        aria-valuenow={ended ? clips.length : safeIndex + 1}
      >
        {clips.map((c, i) => (
          <button
            key={c.key}
            type="button"
            aria-label={`Go to clip ${i + 1}: ${c.title}`}
            onClick={() => goTo(i)}
            className="h-6 flex-1"
          >
            <span
              className={`block h-1 rounded-full ${
                ended || i < safeIndex
                  ? "bg-[#e8c476]"
                  : i === safeIndex
                    ? "bg-[#e8c476]/70"
                    : "bg-white/20"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous clip"
          disabled={safeIndex === 0 && !ended}
          onClick={() => goTo(safeIndex - 1)}
          className="rounded-full border border-white/25 p-3 text-[#f6f3ec] disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={ended ? "Watch again" : playing ? "Pause" : "Play"}
          onClick={togglePlay}
          className="rounded-full bg-[#e8c476] p-4 text-[#171205]"
        >
          {playing && !ended ? (
            <Pause className="h-6 w-6" aria-hidden />
          ) : (
            <Play className="h-6 w-6" aria-hidden />
          )}
        </button>
        <button
          type="button"
          aria-label="Next clip"
          disabled={safeIndex >= clips.length - 1}
          onClick={() => goTo(safeIndex + 1)}
          className="rounded-full border border-white/25 p-3 text-[#f6f3ec] disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <span className="ml-1 text-sm text-[#a49e90]">
          {fmtClock(Math.min(globalTime, total))} / {fmtClock(total)} · clip{" "}
          {Math.min(safeIndex + 1, clips.length)} of {clips.length}
        </span>
        <button
          type="button"
          aria-pressed={captionsOn}
          aria-label="Toggle captions"
          onClick={() => setCaptionsOn((c) => !c)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium ${
            captionsOn
              ? "border-[#e8c476] text-[#e8c476]"
              : "border-white/25 text-[#f6f3ec]"
          }`}
        >
          {captionsOn ? (
            <Captions className="h-4 w-4" aria-hidden />
          ) : (
            <CaptionsOff className="h-4 w-4" aria-hidden />
          )}
          Captions {captionsOn ? "on" : "off"}
        </button>
      </div>

      {audio.map((a) => (
        <audio
          key={a.id}
          ref={(el) => {
            if (el) audioEls.current.set(a.id, el);
            else audioEls.current.delete(a.id);
          }}
          src={a.audioUrl}
          preload="auto"
          className="hidden"
        />
      ))}
    </div>
  );
}

/* ------------------------------ Editor panel ----------------------------- */

type LibTab = "assets" | "effects" | "transitions" | "motions" | "sfx";

const SFX_CATEGORIES = [
  "Nature",
  "Animals",
  "Ambient",
  "Cinematic",
  "Action",
  "Game & UI",
  "Sci-fi & Tech",
  "Horror",
];

function AssetRow({
  thumbUrl,
  name,
  sub,
  disabled,
  disabledNote,
  pending,
  onAdd,
}: {
  thumbUrl: string | null;
  name: string;
  sub: string;
  disabled?: boolean;
  disabledNote?: string;
  pending?: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2">
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          className="h-10 w-16 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-[var(--border)]/50">
          <Film className="h-4 w-4 text-[var(--dim)]" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block text-xs text-[var(--dim)]">
          {disabled && disabledNote ? disabledNote : sub}
        </span>
      </span>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onAdd}
        aria-label={`Add ${name} to the timeline`}
        className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add
      </button>
    </li>
  );
}

function ClipBlock({
  clip,
  index,
  count,
  selected,
  onSelect,
  onUpdate,
  onMove,
  onRemove,
}: {
  clip: EditClip;
  index: number;
  count: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: {
    duration?: number;
    effect?: EffectKey;
    transition?: TransitionKey;
  }) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  const [dur, setDur] = useState(String(clip.duration));
  useEffect(() => {
    setDur(String(clip.duration));
  }, [clip.duration]);
  const commitDur = () => {
    const v = Number(dur);
    if (Number.isFinite(v) && v >= 1 && v <= 120 && v !== clip.duration) {
      onUpdate({ duration: v });
    } else {
      setDur(String(clip.duration));
    }
  };
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-[var(--surface)] p-2.5 sm:w-52 sm:shrink-0 ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/40"
          : "border-[var(--border)]"
      }`}
    >
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`Select clip ${index + 1}: ${clip.title}`}
        onClick={onSelect}
        className="block text-left"
      >
        {clip.imageUrl ? (
          <img
            src={clip.imageUrl}
            alt=""
            className="h-24 w-full rounded object-cover"
            style={{ filter: EFFECT_META[clip.effect].filter }}
          />
        ) : (
          <span className="flex h-24 w-full items-center justify-center rounded bg-[var(--border)]/50 text-xs text-[var(--dim)]">
            Source image missing
          </span>
        )}
        <span className="mt-2 block truncate text-sm font-medium">
          {index + 1}. {clip.title}
        </span>
        <span className="block text-xs text-[var(--dim)]">
          {clip.isMotionClip ? "Motion clip · " : ""}
          {clip.duration}s
          {clip.effect !== "none" &&
            ` · ${EFFECT_META[clip.effect].label}`}
          {index > 0 &&
            clip.transition !== "cut" &&
            ` · ${TRANSITION_META[clip.transition].label} in`}
        </span>
      </button>
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={`clip-dur-${clip.id}`}
          className="text-xs font-medium text-[var(--dim)]"
        >
          Secs
        </label>
        <input
          id={`clip-dur-${clip.id}`}
          type="number"
          min={1}
          max={120}
          step={0.5}
          value={dur}
          onChange={(e) => setDur(e.target.value)}
          onBlur={commitDur}
          onKeyDown={(e) => {
            if (e.key === "Enter")
              (e.target as HTMLInputElement).blur();
          }}
          className="w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm focus:outline-none"
        />
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            aria-label={`Move ${clip.title} earlier`}
            disabled={index === 0}
            onClick={() => onMove("up")}
            className="rounded-md border border-[var(--border)] p-1.5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Move ${clip.title} later`}
            disabled={index >= count - 1}
            onClick={() => onMove("down")}
            className="rounded-md border border-[var(--border)] p-1.5 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Remove ${clip.title} from the timeline`}
            onClick={onRemove}
            className="rounded-md border border-[var(--border)] p-1.5 text-red-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={`clip-fx-${clip.id}`} className="sr-only">
          Look preset for {clip.title}
        </label>
        <select
          id={`clip-fx-${clip.id}`}
          value={clip.effect}
          onChange={(e) =>
            onUpdate({ effect: e.target.value as EffectKey })
          }
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1.5 text-xs focus:outline-none"
        >
          {EFFECT_ORDER.map((k) => (
            <option key={k} value={k}>
              Look: {EFFECT_META[k].label}
            </option>
          ))}
        </select>
        <label htmlFor={`clip-tr-${clip.id}`} className="sr-only">
          Transition into {clip.title}
        </label>
        <select
          id={`clip-tr-${clip.id}`}
          value={clip.transition}
          onChange={(e) =>
            onUpdate({ transition: e.target.value as TransitionKey })
          }
          className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1.5 text-xs focus:outline-none"
        >
          {TRANSITION_ORDER.map((k) => (
            <option key={k} value={k}>
              In: {TRANSITION_META[k].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: EditText;
  onUpdate: (patch: {
    text?: string;
    motion?: TextMotion;
    start?: number;
    duration?: number;
  }) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(item.text);
  const [start, setStart] = useState(String(item.start));
  const [dur, setDur] = useState(String(item.duration));
  useEffect(() => {
    setText(item.text);
  }, [item.text]);
  useEffect(() => {
    setStart(String(item.start));
  }, [item.start]);
  useEffect(() => {
    setDur(String(item.duration));
  }, [item.duration]);
  const commitNum = (
    raw: string,
    current: number,
    apply: (v: number) => void,
    reset: (v: string) => void,
    min: number,
    max: number,
  ) => {
    const v = Number(raw);
    if (Number.isFinite(v) && v >= min && v <= max && v !== current) {
      apply(v);
    } else {
      reset(String(current));
    }
  };
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[var(--bg)] px-2 py-0.5 text-xs font-semibold">
          {TEXT_KIND_LABEL[item.kind]}
        </span>
        {item.kind === "caption" && item.clipId !== null && (
          <span className="text-xs text-[var(--dim)]">
            from its scene — edit freely
          </span>
        )}
        <button
          type="button"
          aria-label={`Delete text: ${item.text}`}
          onClick={onDelete}
          className="ml-auto rounded-md border border-[var(--border)] p-1.5 text-red-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <label htmlFor={`text-body-${item.id}`} className="sr-only">
        Text words
      </label>
      <input
        id={`text-body-${item.id}`}
        value={text}
        maxLength={300}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() && text.trim() !== item.text)
            onUpdate({ text: text.trim() });
          else setText(item.text);
        }}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-sm focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label
          htmlFor={`text-motion-${item.id}`}
          className="font-medium text-[var(--dim)]"
        >
          Motion
        </label>
        <select
          id={`text-motion-${item.id}`}
          value={item.motion}
          onChange={(e) =>
            onUpdate({ motion: e.target.value as TextMotion })
          }
          className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-1.5 py-1.5 focus:outline-none"
        >
          {MOTION_ORDER.map((k) => (
            <option key={k} value={k}>
              {MOTION_META[k].label}
            </option>
          ))}
        </select>
        <label
          htmlFor={`text-start-${item.id}`}
          className="font-medium text-[var(--dim)]"
        >
          Starts at (s)
        </label>
        <input
          id={`text-start-${item.id}`}
          type="number"
          min={0}
          max={3600}
          step={0.5}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() =>
            commitNum(
              start,
              item.start,
              (v) => onUpdate({ start: v }),
              setStart,
              0,
              3600,
            )
          }
          className="w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 focus:outline-none"
        />
        <label
          htmlFor={`text-dur-${item.id}`}
          className="font-medium text-[var(--dim)]"
        >
          For (s)
        </label>
        <input
          id={`text-dur-${item.id}`}
          type="number"
          min={0.5}
          max={600}
          step={0.5}
          value={dur}
          onChange={(e) => setDur(e.target.value)}
          onBlur={() =>
            commitNum(
              dur,
              item.duration,
              (v) => onUpdate({ duration: v }),
              setDur,
              0.5,
              600,
            )
          }
          className="w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 focus:outline-none"
        />
      </div>
    </li>
  );
}

function AudioRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: EditAudio;
  onUpdate: (patch: { volume?: number; start?: number }) => void;
  onDelete: () => void;
}) {
  const [vol, setVol] = useState(item.volume);
  const [start, setStart] = useState(String(item.start));
  useEffect(() => {
    setVol(item.volume);
  }, [item.volume]);
  useEffect(() => {
    setStart(String(item.start));
  }, [item.start]);
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <AudioLines
          className="h-4 w-4 shrink-0 text-[var(--accent)]"
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.name}
        </span>
        <button
          type="button"
          aria-label={`Remove ${item.name} from the audio track`}
          onClick={onDelete}
          className="rounded-md border border-[var(--border)] p-1.5 text-red-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <audio
        controls
        src={item.audioUrl}
        preload="metadata"
        aria-label={`Preview ${item.name}`}
        className="h-9 w-full max-w-md"
      />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label
          htmlFor={`audio-vol-${item.id}`}
          className="flex items-center gap-1.5 font-medium text-[var(--dim)]"
        >
          <Volume2 className="h-4 w-4" aria-hidden />
          Volume {Math.round(vol * 100)}%
        </label>
        <input
          id={`audio-vol-${item.id}`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => setVol(Number(e.target.value))}
          onPointerUp={() => {
            if (vol !== item.volume) onUpdate({ volume: vol });
          }}
          onBlur={() => {
            if (vol !== item.volume) onUpdate({ volume: vol });
          }}
          className="w-36 accent-[var(--accent)]"
        />
        <label
          htmlFor={`audio-start-${item.id}`}
          className="font-medium text-[var(--dim)]"
        >
          Starts at (s)
        </label>
        <input
          id={`audio-start-${item.id}`}
          type="number"
          min={0}
          max={3600}
          step={0.5}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={() => {
            const v = Number(start);
            if (Number.isFinite(v) && v >= 0 && v <= 3600 && v !== item.start)
              onUpdate({ start: v });
            else setStart(String(item.start));
          }}
          className="w-16 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 focus:outline-none"
        />
      </div>
    </li>
  );
}

function EditorPanel({
  projectId,
  title,
  readOnly,
  onChanged,
}: {
  projectId: number;
  title: string;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: ["edit", projectId],
    queryFn: () => api.getEdit({ projectId }),
  });
  const [libTab, setLibTab] = useState<LibTab>("assets");
  const [selectedClipId, setSelectedClipId] = useState<number | null>(null);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [captionNote, setCaptionNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const invalidateEdit = () => {
    void queryClient.invalidateQueries({ queryKey: ["edit", projectId] });
  };
  const changed = () => {
    invalidateEdit();
    onChanged();
  };
  const fail = (e: unknown) =>
    setActionError(
      e instanceof Error ? e.message : "That didn't work — try again.",
    );

  const addToTimeline = useMutation({
    mutationFn: (args: {
      sourceKind: "scene" | "media";
      sourceId: number;
    }) => api.addToTimeline({ projectId, ...args }),
    onSuccess: changed,
    onError: fail,
  });
  const updateClip = useMutation({
    mutationFn: (args: {
      clipId: number;
      duration?: number;
      effect?: EffectKey;
      transition?: TransitionKey;
    }) => api.updateTimelineClip(args),
    onSuccess: changed,
    onError: fail,
  });
  const moveClip = useMutation({
    mutationFn: (args: { clipId: number; direction: "up" | "down" }) =>
      api.moveTimelineClip(args),
    onSuccess: changed,
  });
  const removeClip = useMutation({
    mutationFn: (clipId: number) => api.removeTimelineClip({ clipId }),
    onSuccess: changed,
  });
  const addText = useMutation({
    mutationFn: (args: {
      text: string;
      kind: TextKind;
      motion: TextMotion;
      start: number;
      duration: number;
    }) => api.addTimelineText({ projectId, ...args }),
    onSuccess: changed,
    onError: fail,
  });
  const updateText = useMutation({
    mutationFn: (args: {
      textId: number;
      text?: string;
      motion?: TextMotion;
      start?: number;
      duration?: number;
    }) => api.updateTimelineText(args),
    onSuccess: changed,
    onError: fail,
  });
  const deleteText = useMutation({
    mutationFn: (textId: number) => api.deleteTimelineText({ textId }),
    onSuccess: changed,
  });
  const genCaptions = useMutation({
    mutationFn: () => api.generateCaptions({ projectId }),
    onSuccess: (res) => {
      setCaptionNote(
        res.created > 0
          ? `Added ${res.created} caption${res.created === 1 ? "" : "s"} — one per scene clip, on the text track below. Edit any of them.`
          : "Every scene clip on the timeline already has a caption — nothing added, and your edits were left alone.",
      );
      changed();
    },
    onError: fail,
  });
  const autoEdit = useMutation({
    mutationFn: (replace: boolean) => api.autoEdit({ projectId, replace }),
    onSuccess: () => {
      setConfirmAuto(false);
      changed();
    },
    onError: fail,
  });
  const exportCut = useMutation({
    mutationFn: () => api.exportCut({ projectId }),
    onSuccess: changed,
    onError: fail,
  });
  const clearCut = useMutation({
    mutationFn: () => api.clearCut({ projectId }),
    onSuccess: changed,
  });
  const uploadAudio = useMutation({
    mutationFn: async (file: File) => {
      const enc = await fileToBase64(file);
      return api.uploadEditorAudio({
        projectId,
        name: file.name,
        dataBase64: enc.dataBase64,
        mimeType: enc.mimeType,
      });
    },
    onSuccess: changed,
    onError: () =>
      setAudioError(
        "That upload didn't work — use an MP3, WAV, M4A, OGG, WebM, or AAC audio file.",
      ),
  });
  const updateAudio = useMutation({
    mutationFn: (args: {
      audioId: number;
      volume?: number;
      start?: number;
    }) => api.updateTimelineAudio(args),
    onSuccess: changed,
  });
  const deleteAudio = useMutation({
    mutationFn: (audioId: number) => api.deleteTimelineAudio({ audioId }),
    onSuccess: changed,
  });

  const edit = data.data;
  const clips = edit?.clips ?? [];
  const texts = edit?.texts ?? [];
  const audioItems = edit?.audio ?? [];
  const totalDuration = clips.reduce((a, c) => a + c.duration, 0);
  const selectedClip =
    clips.find((c) => c.id === selectedClipId) ?? clips[0] ?? null;
  useEffect(() => {
    if (selectedClip && selectedClip.id !== selectedClipId)
      setSelectedClipId(selectedClip.id);
  }, [selectedClip, selectedClipId]);

  if (readOnly) {
    return (
      <section className="mt-12">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <Scissors className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Video Editor
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
          Sample films are read-only — open one of your own films to cut it
          in the editor.
        </p>
      </section>
    );
  }

  const textPresets: {
    label: string;
    blurb: string;
    text: string;
    kind: TextKind;
    motion: TextMotion;
    start: number;
    duration: number;
  }[] = [
    {
      label: "Opening title · Fade rise",
      blurb: "The film's title, rising gently over the first shot.",
      text: title || "Untitled film",
      kind: "title",
      motion: "fade_rise",
      start: 0,
      duration: 4,
    },
    {
      label: "Opening title · Slam",
      blurb: "The title slams in hard over the first shot.",
      text: title || "Untitled film",
      kind: "title",
      motion: "slam",
      start: 0,
      duration: 3,
    },
    {
      label: "Typewriter title",
      blurb: "The title types itself out, letter by letter.",
      text: title || "Untitled film",
      kind: "title",
      motion: "typewriter",
      start: 0,
      duration: Math.max(3, Math.ceil((title || "Untitled").length * 0.06) + 1),
    },
    {
      label: "Lower third · Fade rise",
      blurb: "A name-and-role strap near the bottom of the frame.",
      text: "Name — role or place",
      kind: "lower_third",
      motion: "fade_rise",
      start: 2,
      duration: 4,
    },
    {
      label: "End credits · Credit roll",
      blurb: "A rolling credit over the end of the cut.",
      text: `${title || "Untitled film"} — a FilmKit production`,
      kind: "title",
      motion: "credit_roll",
      start: Math.max(0, totalDuration - 6),
      duration: 6,
    },
  ];

  const libTabs: { key: LibTab; label: string }[] = [
    { key: "assets", label: "Assets" },
    { key: "effects", label: "Effects" },
    { key: "transitions", label: "Transitions" },
    { key: "motions", label: "Motions" },
    { key: "sfx", label: "SFX" },
  ];

  return (
    <section className="relative left-1/2 mt-12 w-[min(97vw,1280px)] -translate-x-1/2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold">
          <Scissors className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          Video Editor
        </h2>
        {edit?.hasCut && (
          <span className="rounded-full bg-[#e8c476]/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#7a5a12]">
            Cut exported
          </span>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">
        Assemble the cut: clips on the video track, titles and captions on
        the text track, your own soundtrack on the audio track. Export the
        cut and Watch plays this edit — order, looks, transitions, text, and
        all — instead of the raw scenes.
      </p>

      {data.isPending && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--dim)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Opening the editing room…
        </p>
      )}
      {data.isError && (
        <p className="mt-4 text-sm text-red-700">
          The edit couldn't be loaded. Try again in a moment.
        </p>
      )}

      {edit && (
        <>
          {/* Preview */}
          <div className="mx-auto mt-5 max-w-4xl rounded-[var(--radius)] bg-[var(--ink)] p-3 text-[#f6f3ec] sm:p-4">
            <CutPlayer
              clips={clips.map((c) => ({
                key: `clip-${c.id}`,
                title: c.title,
                imageUrl: c.imageUrl,
                duration: c.duration,
                effect: c.effect,
                transition: c.transition,
                isMotionClip: c.isMotionClip,
              }))}
              texts={texts}
              audio={audioItems}
            />
          </div>

          {/* Cut actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {confirmAuto ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                Replace the current timeline with every filmed scene, in
                order?
                <button
                  type="button"
                  disabled={autoEdit.isPending}
                  onClick={() => autoEdit.mutate(true)}
                  className="rounded-lg bg-[var(--accent)] px-3.5 py-2 font-semibold text-white disabled:opacity-40"
                >
                  Yes, replace it
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAuto(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 font-medium"
                >
                  Keep my timeline
                </button>
              </span>
            ) : (
              <button
                type="button"
                disabled={autoEdit.isPending}
                onClick={() => {
                  setActionError(null);
                  if (clips.length > 0) setConfirmAuto(true);
                  else autoEdit.mutate(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
              >
                <WandSparkles className="h-4 w-4" aria-hidden />
                Auto edit
              </button>
            )}
            <button
              type="button"
              disabled={genCaptions.isPending || clips.length === 0}
              onClick={() => {
                setCaptionNote(null);
                genCaptions.mutate();
              }}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              <Captions className="h-4 w-4" aria-hidden />
              Generate captions
            </button>
            <span className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" aria-hidden />
            <button
              type="button"
              disabled={exportCut.isPending || clips.length === 0}
              onClick={() => exportCut.mutate()}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Check className="h-4 w-4" aria-hidden />
              {edit.hasCut ? "Re-export cut" : "Export cut"}
            </button>
            {edit.hasCut && (
              <button
                type="button"
                disabled={clearCut.isPending}
                onClick={() => clearCut.mutate()}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--dim)] underline disabled:opacity-40"
              >
                Withdraw cut
              </button>
            )}
            <span className="text-sm text-[var(--dim)]">
              {edit.hasCut
                ? "Watch and FilmKit TV play this cut — it always reflects the current timeline."
                : "No cut exported yet — Watch plays the raw scene sequence."}
            </span>
          </div>
          {captionNote && (
            <p className="mt-2 text-sm text-[var(--dim)]">{captionNote}</p>
          )}
          {actionError && (
            <p className="mt-2 text-sm text-red-700">{actionError}</p>
          )}

          <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* Library */}
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div
                className="flex flex-wrap gap-1.5"
                role="tablist"
                aria-label="Editor library"
              >
                {libTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={libTab === t.key}
                    onClick={() => setLibTab(t.key)}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium ${
                      libTab === t.key
                        ? "bg-[var(--ink)] text-[#f6f3ec]"
                        : "border border-[var(--border)] bg-[var(--bg)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {libTab === "assets" && (
                <div className="mt-4 space-y-5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                      Storyboard
                    </h3>
                    {edit.assets.scenes.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--dim)]">
                        No scenes yet — the storyboard is empty.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {edit.assets.scenes.map((s, i) => (
                          <AssetRow
                            key={s.id}
                            thumbUrl={s.imageUrl}
                            name={s.title}
                            sub={`Scene ${i + 1}`}
                            disabled={!s.ready}
                            disabledNote="Not filmed yet — generate its still on the storyboard"
                            pending={addToTimeline.isPending}
                            onAdd={() =>
                              addToTimeline.mutate({
                                sourceKind: "scene",
                                sourceId: s.id,
                              })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                      Canvas bin
                    </h3>
                    {edit.assets.binMedia.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--dim)]">
                        Nothing flagged yet — use “Editor bin” on any canvas
                        media item to line it up here.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {edit.assets.binMedia.map((m) => (
                          <AssetRow
                            key={m.id}
                            thumbUrl={m.imageUrl}
                            name={m.name}
                            sub={
                              m.kind === "clip"
                                ? "Motion clip · canvas bin"
                                : m.kind === "upload"
                                  ? "Upload · canvas bin"
                                  : "Still · canvas bin"
                            }
                            pending={addToTimeline.isPending}
                            onAdd={() =>
                              addToTimeline.mutate({
                                sourceKind: "media",
                                sourceId: m.id,
                              })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                      Clips
                    </h3>
                    {edit.assets.clips.length === 0 ? (
                      <p className="mt-2 text-sm text-[var(--dim)]">
                        No motion clips yet — make one from any still on the
                        canvas (“Make a motion clip”).
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {edit.assets.clips.map((m) => (
                          <AssetRow
                            key={m.id}
                            thumbUrl={m.imageUrl}
                            name={m.name}
                            sub="Motion clip · canvas"
                            pending={addToTimeline.isPending}
                            onAdd={() =>
                              addToTimeline.mutate({
                                sourceKind: "media",
                                sourceId: m.id,
                              })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {libTab === "effects" && (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-[var(--dim)]">
                    {selectedClip
                      ? `Look presets for “${selectedClip.title}” — applied in the preview and in Watch, no re-rendering.`
                      : "Add a clip to the timeline first, then pick its look."}
                  </p>
                  {selectedClip && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {EFFECT_ORDER.map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={selectedClip.effect === k}
                          onClick={() =>
                            updateClip.mutate({
                              clipId: selectedClip.id,
                              effect: k,
                            })
                          }
                          className={`rounded-lg border px-3 py-2.5 text-left ${
                            selectedClip.effect === k
                              ? "border-[var(--accent)] bg-[#e8c476]/15"
                              : "border-[var(--border)] bg-[var(--bg)]"
                          }`}
                        >
                          <span className="block text-sm font-semibold">
                            {EFFECT_META[k].label}
                          </span>
                          <span className="block text-xs text-[var(--dim)]">
                            {EFFECT_META[k].blurb}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {libTab === "transitions" && (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-[var(--dim)]">
                    {selectedClip
                      ? `How playback moves into “${selectedClip.title}”. The first clip on the timeline always opens cold.`
                      : "Add a clip to the timeline first, then choose how playback moves into it."}
                  </p>
                  {selectedClip && (
                    <div className="mt-3 space-y-2">
                      {TRANSITION_ORDER.map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={selectedClip.transition === k}
                          onClick={() =>
                            updateClip.mutate({
                              clipId: selectedClip.id,
                              transition: k,
                            })
                          }
                          className={`block w-full rounded-lg border px-3 py-2.5 text-left ${
                            selectedClip.transition === k
                              ? "border-[var(--accent)] bg-[#e8c476]/15"
                              : "border-[var(--border)] bg-[var(--bg)]"
                          }`}
                        >
                          <span className="block text-sm font-semibold">
                            {TRANSITION_META[k].label}
                          </span>
                          <span className="block text-xs text-[var(--dim)]">
                            {TRANSITION_META[k].blurb}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {libTab === "motions" && (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-[var(--dim)]">
                    Animated text presets — each one lands on the text track,
                    ready to edit (words, timing, motion).
                  </p>
                  <div className="mt-3 space-y-2">
                    {textPresets.map((p) => (
                      <div
                        key={p.label}
                        className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <Type className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            {p.label}
                          </span>
                          <span className="block text-xs text-[var(--dim)]">
                            {p.blurb}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={addText.isPending}
                          onClick={() =>
                            addText.mutate({
                              text: p.text,
                              kind: p.kind,
                              motion: p.motion,
                              start: p.start,
                              duration: p.duration,
                            })
                          }
                          aria-label={`Add text preset: ${p.label}`}
                          className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--ink)] px-3 py-2 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {libTab === "sfx" && (
                <div className="mt-4">
                  <p className="text-sm leading-relaxed text-[var(--dim)]">
                    A sound-effects library needs real audio models, which
                    arrive at Stage 9 — FilmKit doesn't stock fake clips.
                    The categories are waiting:
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {SFX_CATEGORIES.map((c) => (
                      <li
                        key={c}
                        className="rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--dim)]"
                      >
                        {c} · Stage 9
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <p className="text-sm font-semibold">
                      Your own soundtrack works today
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--dim)]">
                      Upload an audio file and it lands on the audio track
                      under the timeline — set its volume and where it
                      starts, and it plays under the cut.
                    </p>
                    <button
                      type="button"
                      disabled={uploadAudio.isPending}
                      onClick={() => audioFileRef.current?.click()}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[#f6f3ec] disabled:opacity-40"
                    >
                      {uploadAudio.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="h-4 w-4" aria-hidden />
                      )}
                      Upload audio
                    </button>
                    <input
                      ref={audioFileRef}
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg,audio/webm,audio/aac"
                      aria-label="Upload an audio file to the audio track"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) {
                          setAudioError(null);
                          uploadAudio.mutate(file);
                        }
                      }}
                    />
                    {audioError && (
                      <p className="mt-2 text-sm text-red-700">{audioError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-base font-bold">Timeline</h3>
                <span className="text-sm text-[var(--dim)]">
                  {clips.length} {clips.length === 1 ? "clip" : "clips"} ·{" "}
                  {fmtClock(totalDuration)} long
                </span>
              </div>

              <h4 className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                Video track
              </h4>
              {clips.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--dim)]">
                  The timeline is empty. Add clips from the Assets tab, or
                  let Auto edit assemble every filmed scene in order.
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:overflow-x-auto sm:pb-2">
                  {clips.map((c, i) => (
                    <ClipBlock
                      key={c.id}
                      clip={c}
                      index={i}
                      count={clips.length}
                      selected={selectedClip?.id === c.id}
                      onSelect={() => setSelectedClipId(c.id)}
                      onUpdate={(patch) =>
                        updateClip.mutate({ clipId: c.id, ...patch })
                      }
                      onMove={(direction) =>
                        moveClip.mutate({ clipId: c.id, direction })
                      }
                      onRemove={() => removeClip.mutate(c.id)}
                    />
                  ))}
                </div>
              )}

              <h4 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                Text track
              </h4>
              {texts.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--dim)]">
                  No text yet — add a title or credits from the Motions tab,
                  or generate captions from your scenes.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {texts.map((t) => (
                    <TextRow
                      key={t.id}
                      item={t}
                      onUpdate={(patch) =>
                        updateText.mutate({ textId: t.id, ...patch })
                      }
                      onDelete={() => deleteText.mutate(t.id)}
                    />
                  ))}
                </ul>
              )}

              <h4 className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--dim)]">
                Audio track
              </h4>
              {audioItems.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--dim)]">
                  No soundtrack yet — upload one from the SFX tab and it
                  plays under the cut.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {audioItems.map((a) => (
                    <AudioRow
                      key={a.id}
                      item={a}
                      onUpdate={(patch) =>
                        updateAudio.mutate({ audioId: a.id, ...patch })
                      }
                      onDelete={() => deleteAudio.mutate(a.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* --------------------------------- Player -------------------------------- */

const SCENE_MS = 6500;

function GalleryWatchBar({
  projectId,
  onOpenStudio,
}: {
  projectId: number;
  onOpenStudio: (id: number) => void;
}) {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const actions = useGalleryActions(onOpenStudio);
  const gallery = useQuery({ queryKey: ["gallery"], queryFn: () => api.listGallery({}) });
  const film = gallery.data?.films.find((f) => f.id === projectId);
  if (!film) return null;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-[#a49e90]">by {film.creator} · {formatRuntime(film.runtimeSeconds)}{film.festivalSubmitted ? " · Submitted to the festival" : ""}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => actions.like.mutate(film)} aria-label={`${film.liked ? "Unlike" : "Like"} ${film.title}`} aria-pressed={film.liked} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${film.liked ? "border-[#e8c476] bg-[#e8c476]/15" : "border-white/25"}`}>
          <Heart className={`h-4 w-4 ${film.liked ? "fill-[#e8c476] text-[#e8c476]" : ""}`} aria-hidden /> Like · {film.likes}
        </button>
        <button type="button" onClick={() => actions.support.mutate(film)} aria-label={`${film.supported ? "Withdraw support for" : "Support"} ${film.title}`} aria-pressed={film.supported} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${film.supported ? "border-[#e8c476] bg-[#e8c476]/15" : "border-white/25"}`}>
          <Sparkles className="h-4 w-4" aria-hidden /> {film.supported ? "Supported" : "Support"} · {film.supports}
        </button>
        <button type="button" onClick={() => setShowWorkflow((v) => !v)} aria-label={`Get workflow for ${film.title}`} aria-expanded={showWorkflow} className="flex items-center gap-1.5 rounded-full bg-[#e8c476] px-3.5 py-2 text-sm font-semibold text-[#171205]">
          <ScrollText className="h-4 w-4" aria-hidden /> Get Workflow
        </button>
        <button type="button" onClick={() => actions.festival.mutate(film)} aria-label={film.festivalSubmitted ? `Withdraw ${film.title} from the festival` : `Submit ${film.title} to the festival`} aria-pressed={film.festivalSubmitted} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium ${film.festivalSubmitted ? "border-[#e8c476] bg-[#e8c476]/15" : "border-white/25"}`}>
          <Trophy className="h-4 w-4" aria-hidden /> {film.festivalSubmitted ? "In the festival" : "Submit to the festival"}
        </button>
      </div>
      <p className="mx-auto mt-2 max-w-xl text-center text-xs leading-relaxed text-[#a49e90]">
        Support is in-app only — no money moves; tipping and payouts arrive with accounts at Stage 9. The festival is FilmKit's in-app shelf; prizes and judging are a future step, not promised here.
      </p>
      {(actions.like.isError || actions.support.isError || actions.festival.isError) && <p className="mt-2 text-center text-sm text-red-300">That didn't go through. Try again.</p>}
      {showWorkflow && (
        <div className="mt-5 text-left">
          <WorkflowPanel projectId={projectId} onOpenStudio={onOpenStudio} dark />
        </div>
      )}
    </div>
  );
}

function WatchView({
  projectId,
  onBack,
  onOpenStudio,
}: {
  projectId: number;
  onBack: () => void;
  onOpenStudio: (id: number) => void;
}) {
  const data = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject({ projectId }),
  });
  // Motion clips made on the canvas (Stage 4) play after the scenes —
  // they are the player's clip source until the Stage 5 editor assembles
  // a real timeline.
  const canvasData = useQuery({
    queryKey: ["canvas", projectId],
    queryFn: () => api.getCanvas({ projectId }),
  });
  // Stage 5: once a cut is exported, Watch plays the cut (the editor's
  // timeline) instead of the raw scene sequence.
  const editData = useQuery({
    queryKey: ["edit", projectId],
    queryFn: () => api.getEdit({ projectId }),
  });
  const acctQ = useAccount();
  const showWatermark =
    !!data.data && !data.data.project.isSample &&
    (acctQ.data?.account.plan === "free" || acctQ.data?.account.plan === "casual");
  const watermarkPos = acctQ.data?.account.watermarkPos ?? "top-right";
  const watermarkEl = showWatermark ? (
    <span className={`pointer-events-none absolute top-3 z-20 rounded bg-black/55 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/90 ${watermarkPos === "top-left" ? "left-3" : "right-3"}`}>
      Made with FilmKit
    </span>
  ) : null;
  const cut = editData.data ?? null;
  const playCut = !!cut?.hasCut && (cut?.clips.length ?? 0) > 0;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);

  type PlayableEntry = {
    key: string;
    imageUrl: string | null;
    title: string;
    description: string;
    clip: boolean;
  };
  const sceneEntries: PlayableEntry[] = (data.data?.scenes ?? [])
    .filter((s) => s.status === "ready" && s.imageUrl)
    .map((s) => ({
      key: `scene-${s.id}`,
      imageUrl: s.imageUrl,
      title: s.title,
      description: s.description,
      clip: false,
    }));
  const clipEntries: PlayableEntry[] = (canvasData.data?.media ?? [])
    .filter((m) => m.kind === "clip" && m.imageUrl && !m.archived)
    .map((m) => ({
      key: `clip-${m.id}`,
      imageUrl: m.imageUrl,
      title: m.name,
      description: m.prompt
        ? `Motion clip · ${m.prompt}`
        : "Motion clip from the canvas",
      clip: true,
    }));
  const playable = [...sceneEntries, ...clipEntries];
  const current = playable[Math.min(index, Math.max(playable.length - 1, 0))];

  useEffect(() => {
    if (!playing || ended || playable.length === 0) return;
    const t = setTimeout(() => {
      if (index + 1 >= playable.length) {
        setEnded(true);
        setPlaying(false);
      } else {
        setIndex(index + 1);
      }
    }, SCENE_MS);
    return () => clearTimeout(t);
  }, [playing, ended, index, playable.length]);

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(i, playable.length - 1)));
    setEnded(false);
    setPlaying(true);
  };

  return (
    <main className="min-h-screen bg-[var(--ink)] text-[#f6f3ec]">
      <div className="mx-auto max-w-4xl px-4 pb-12 pt-safe">
        <div className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-sm font-medium text-[#f6f3ec]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
          {data.data && !data.data.project.isSample && (
            <button
              type="button"
              onClick={() => onOpenStudio(projectId)}
              className="rounded-full border border-white/20 px-3.5 py-2 text-sm font-medium"
            >
              Open in studio
            </button>
          )}
        </div>

        {data.isPending && (
          <p className="flex items-center gap-2 py-16 text-sm text-[#a49e90]">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Threading the projector…
          </p>
        )}
        {data.isError && (
          <p className="py-16 text-base">This film couldn't be loaded.</p>
        )}

        {data.data && (
          <>
            <h1 className="font-display text-center text-3xl font-black sm:text-4xl">
              {data.data.project.title}
            </h1>
            <p className="mt-1 text-center text-sm text-[#a49e90]">
              A {data.data.project.style} short ·{" "}
              {playCut && cut ? (
                <>
                  Director's cut · {cut.clips.length}{" "}
                  {cut.clips.length === 1 ? "clip" : "clips"}
                </>
              ) : (
                <>
                  {sceneEntries.length}{" "}
                  {sceneEntries.length === 1 ? "scene" : "scenes"}
                  {clipEntries.length > 0 &&
                    ` · ${clipEntries.length} motion ${
                      clipEntries.length === 1 ? "clip" : "clips"
                    }`}
                </>
              )}
              {data.data.project.isSample && " · Sample film"}
            </p>
            <GalleryWatchBar projectId={projectId} onOpenStudio={onOpenStudio} />

            {playCut && cut && (
              <div className="relative mt-6">
                {watermarkEl}
                <p className="mb-3 text-center text-sm text-[#a49e90]">
                  The director's cut — assembled in the Editor: order,
                  durations, looks, transitions, text, captions, and
                  soundtrack.
                </p>
                <CutPlayer
                  clips={cut.clips.map((c) => ({
                    key: `cut-${c.id}`,
                    title: c.title,
                    imageUrl: c.imageUrl,
                    duration: c.duration,
                    effect: c.effect,
                    transition: c.transition,
                    isMotionClip: c.isMotionClip,
                  }))}
                  texts={cut.texts}
                  audio={cut.audio}
                />
              </div>
            )}

            {!playCut && (
              <>
            {/* Progress segments */}
            <div
              className="mt-6 flex gap-1.5"
              role="progressbar"
              aria-label="Film progress"
              aria-valuemin={0}
              aria-valuemax={playable.length}
              aria-valuenow={ended ? playable.length : index + (playable.length ? 1 : 0)}
            >
              {playable.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Go to ${s.clip ? "motion clip" : `scene ${i + 1}`}: ${s.title}`}
                  onClick={() => goTo(i)}
                  className="h-6 flex-1"
                >
                  <span
                    className={`block h-1 rounded-full ${
                      ended || i < index
                        ? "bg-[#e8c476]"
                        : i === index
                          ? "bg-[#e8c476]/70"
                          : "bg-white/20"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Stage */}
            <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black shadow-2xl">
              {watermarkEl}
              {current && !ended && (
                <>
                  <img
                    key={current.key}
                    src={current.imageUrl ?? ""}
                    alt={`${current.clip ? "Motion clip" : "Scene"}: ${current.title}`}
                    className={`absolute inset-0 h-full w-full object-cover ${
                      index % 2 === 0 ? "kb-a" : "kb-b"
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-5 pt-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8c476]">
                      {current.clip
                        ? `Motion clip · ${current.title}`
                        : `Scene ${index + 1} · ${current.title}`}
                    </p>
                    <p className="font-display mt-1 max-w-2xl text-lg italic leading-snug text-white sm:text-xl">
                      {current.description}
                    </p>
                  </div>
                </>
              )}
              {ended && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="font-display text-4xl font-black italic">
                    The End
                  </p>
                  <p className="text-sm text-[#a49e90]">
                    {data.data.project.title} · a FilmKit production
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(0)}
                    className="mt-2 flex items-center gap-2 rounded-full bg-[#e8c476] px-5 py-2.5 text-sm font-semibold text-[#171205]"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Watch again
                  </button>
                </div>
              )}
              {playable.length === 0 && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <Film className="h-10 w-10 text-[#57534a]" aria-hidden />
                  <p className="text-sm text-[#a49e90]">
                    No scenes are filmed yet, so there's nothing to project.
                  </p>
                  {!data.data.project.isSample && (
                    <button
                      type="button"
                      onClick={() => onOpenStudio(projectId)}
                      className="mt-2 rounded-full bg-[#e8c476] px-5 py-2.5 text-sm font-semibold text-[#171205]"
                    >
                      Go to the studio
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            {playable.length > 0 && !ended && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Previous scene"
                  disabled={index === 0}
                  onClick={() => goTo(index - 1)}
                  className="rounded-full border border-white/25 p-3 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pause" : "Play"}
                  onClick={() => setPlaying(!playing)}
                  className="rounded-full bg-[#e8c476] p-4 text-[#171205]"
                >
                  {playing ? (
                    <Pause className="h-6 w-6" aria-hidden />
                  ) : (
                    <Play className="h-6 w-6" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Next scene"
                  disabled={index >= playable.length - 1}
                  onClick={() => goTo(index + 1)}
                  className="rounded-full border border-white/25 p-3 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
                <span className="ml-2 text-sm text-[#a49e90]">
                  {index + 1} / {playable.length}
                </span>
              </div>
            )}
              </>
            )}

            {/* Scene list */}
            <ol className="mx-auto mt-10 max-w-2xl space-y-3">
              {data.data.scenes.map((s, i) => (
                <li key={s.id} className="text-sm">
                  <div className="flex items-baseline gap-3">
                    <span className="shrink-0 text-[#a49e90]">{i + 1}.</span>
                    <span className="font-medium">{s.title}</span>
                    {s.status !== "ready" && (
                      <span className="ml-auto shrink-0 text-xs uppercase tracking-wide text-[#a49e90]">
                        not filmed
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 pl-6 leading-relaxed text-[#a49e90]">
                    {s.description}
                  </p>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </main>
  );
}
