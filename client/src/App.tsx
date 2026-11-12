import { useEffect, useRef, useState } from "react";
import {
useMutation,
useQuery,
useQueryClient,
} from "@tanstack/react-query";
import {
ArrowLeft,
ArrowDown,
ArrowUp,
ChevronLeft,
ChevronRight,
Clapperboard,
Film,
Loader2,
Pause,
Play,
Plus,
RotateCcw,
Sparkles,
Trash2,
TriangleAlert,
} from "lucide-react";
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

type View =
  | { name: "home" }
  | { name: "studio"; projectId: number }
  | { name: "watch"; projectId: number };

export function App() {
  const [view, setView] = useState<View>({ name: "home" });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {view.name === "home" && (
        <HomeView
          onOpenStudio={(id) => setView({ name: "studio", projectId: id })}
          onWatch={(id) => setView({ name: "watch", projectId: id })}
        />
      )}
      {view.name === "studio" && (
        <StudioView
          projectId={view.projectId}
          onBack={() => setView({ name: "home" })}
          onWatch={(id) => setView({ name: "watch", projectId: id })}
        />
      )}
      {view.name === "watch" && (
        <WatchView
          projectId={view.projectId}
          onBack={() => setView({ name: "home" })}
          onOpenStudio={(id) => setView({ name: "studio", projectId: id })}
        />
      )}
    </div>
  );
}

/* ---------------------------------- Home --------------------------------- */

function HomeView({
  onOpenStudio,
  onWatch,
}: {
  onOpenStudio: (id: number) => void;
  onWatch: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<Style>("Noir");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });

  const create = useMutation({
    mutationFn: () => api.createProject({ prompt: prompt.trim(), style }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries();
      onOpenStudio(data.projectId);
    },
  });

  const mine = (projects.data?.projects ?? []).filter((p) => !p.isSample);
  const gallery = (projects.data?.projects ?? []).filter(
    (p) => p.readyCount > 0,
  );

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

          <div className="mt-8 rounded-[var(--radius)] bg-black/45 p-4 backdrop-blur-sm sm:p-5">
            <label
              htmlFor="story-prompt"
              className="text-sm font-medium text-[#f6f3ec]"
            >
              What story do you want to create today?
            </label>
            <textarea
              id="story-prompt"
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
                  aria-pressed={style === s}
                  onClick={() => setStyle(s)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    style === s
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

      {/* My films */}
      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="font-display text-3xl font-bold">My films</h2>
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
        {projects.isSuccess && mine.length === 0 && (
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--dim)]">
            Nothing here yet. Type a story above and your first film will be
            waiting in the storyboard studio.
          </p>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => onOpenStudio(p.id)}
              onWatch={() => onWatch(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-3xl font-bold">FilmKit TV</h2>
            <span className="text-sm text-[var(--dim)]">
              Finished films, ready to watch
            </span>
          </div>
          {projects.isSuccess && gallery.length === 0 && (
            <p className="mt-4 text-base text-[var(--dim)]">
              The gallery fills up as films are finished — generate every
              scene in one of your films and it premieres here.
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
}: {
  project: ProjectSummary;
  onOpen: () => void;
  onWatch: () => void;
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
        </span>
        <span className="block px-4 pb-2 pt-3">
          <span className="font-display block truncate text-lg font-bold leading-snug">
            {project.title}
          </span>
          <span className="mt-1 block truncate text-sm text-[var(--dim)]">
            {project.prompt}
          </span>
        </span>
      </button>
      <div className="flex items-center gap-2 px-4 pb-4">
        <span className="rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium text-[var(--dim)]">
          {project.style}
        </span>
        <span className="text-xs text-[var(--dim)]">
          {project.readyCount} of {project.sceneCount} scenes filmed
        </span>
        {project.readyCount > 0 && (
          <button
            type="button"
            onClick={onWatch}
            aria-label={`Watch ${project.title}`}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 py-1.5 text-sm font-medium text-[#f6f3ec]"
          >
            <Play className="h-4 w-4" aria-hidden />
            {done ? "Watch" : "Preview"}
          </button>
        )}
      </div>
    </article>
  );
}

/* --------------------------------- Studio -------------------------------- */

function StudioView({
  projectId,
  onBack,
  onWatch,
}: {
  projectId: number;
  onBack: () => void;
  onWatch: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const data = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject({ projectId }),
  });

  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bulkRunning = useRef(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const generateOne = async (sceneId: number) => {
    setGeneratingId(sceneId);
    try {
      await api.generateScene({ sceneId });
    } finally {
      setGeneratingId(null);
      invalidate();
    }
  };

  const generateAll = async () => {
    if (bulkRunning.current || !data.data) return;
    const pending = data.data.scenes.filter((s) => s.status !== "ready");
    if (pending.length === 0) return;
    bulkRunning.current = true;
    setBulkProgress({ current: 0, total: pending.length });
    try {
      for (const [i, scene] of pending.entries()) {
        setBulkProgress({ current: i + 1, total: pending.length });
        setGeneratingId(scene.id);
        await api.generateScene({ sceneId: scene.id });
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

  const { project, scenes } = data.data;
  const readyCount = scenes.filter((s) => s.status === "ready").length;
  const allReady = scenes.length > 0 && readyCount === scenes.length;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-safe">
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

      <TitleEditor project={project} onSaved={invalidate} />
      <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">
        <span className="mr-2 rounded-full bg-[var(--surface)] px-2.5 py-0.5 text-xs font-medium">
          {project.style}
        </span>
        {project.isSample && (
          <span className="mr-2 rounded-full bg-[#e8c476]/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#7a5a12]">
            Sample film
          </span>
        )}
        “{project.prompt}”
      </p>

      {!project.isSample && (
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
                Generate all scenes
              </>
            )}
          </button>
          <span className="text-sm text-[var(--dim)]">
            {readyCount} of {scenes.length} scenes filmed · each still takes
            about 15 seconds
          </span>
        </div>
      )}

      <ol className="mt-8 space-y-6">
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            total={scenes.length}
            readOnly={project.isSample}
            generating={generatingId === scene.id}
            anyGenerating={generatingId !== null}
            onGenerate={() => void generateOne(scene.id)}
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
      All films
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
  readOnly,
  generating,
  anyGenerating,
  onGenerate,
  onChanged,
}: {
  scene: Scene;
  index: number;
  total: number;
  readOnly: boolean;
  generating: boolean;
  anyGenerating: boolean;
  onGenerate: () => void;
  onChanged: () => void;
}) {
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
                    Re-generate
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Generate scene
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
          </>
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

/* --------------------------------- Player -------------------------------- */

const SCENE_MS = 6500;

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
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);

  const playable = (data.data?.scenes ?? []).filter(
    (s) => s.status === "ready" && s.imageUrl,
  );
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
            All films
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
              A {data.data.project.style} short · {playable.length}{" "}
              {playable.length === 1 ? "scene" : "scenes"}
              {data.data.project.isSample && " · Sample film"}
            </p>

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
                  key={s.id}
                  type="button"
                  aria-label={`Go to scene ${i + 1}: ${s.title}`}
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
              {current && !ended && (
                <>
                  <img
                    key={current.id}
                    src={current.imageUrl ?? ""}
                    alt={`Scene: ${current.title}`}
                    className={`absolute inset-0 h-full w-full object-cover ${
                      index % 2 === 0 ? "kb-a" : "kb-b"
                    }`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-5 pb-5 pt-16">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8c476]">
                      Scene {index + 1} · {current.title}
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
