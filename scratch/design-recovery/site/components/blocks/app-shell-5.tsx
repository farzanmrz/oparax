"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import {
  Archive,
  ArrowLeft,
  AtSign,
  Bell,
  Clock,
  Download,
  FileText,
  Inbox,
  Menu,
  MoreHorizontal,
  Reply,
  Search,
  Send,
  SlidersHorizontal,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setEdges({
      start: scrollTop > 1,
      end: Math.ceil(scrollTop + clientHeight) < scrollHeight - 1,
    });
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    const view = el?.ownerDocument.defaultView;
    if (!el || !view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  return { ref, edges, onScroll: update };
}

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const focusInset =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color] duration-150 ease-out";

const tertiaryIconBase =
  "h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-100";

const tertiaryIcon = `inline-flex ${tertiaryIconBase}`;
const tertiaryIconFromSm = `hidden sm:inline-flex ${tertiaryIconBase}`;

type IconType = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

type Mailbox = {
  id: string;
  label: string;
  icon: IconType;
  unread?: boolean;
};

const MAILBOXES: Mailbox[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "mentions", label: "Mentions", icon: AtSign, unread: true },
  { id: "snoozed", label: "Snoozed", icon: Clock },
  { id: "sent", label: "Sent", icon: Send },
  { id: "archive", label: "Archive", icon: Archive },
];

const FILTERS = ["All", "Unread", "Assigned", "Escalated"] as const;
type Filter = (typeof FILTERS)[number];

type Conversation = {
  id: string;
  name: string;
  email: string;
  subject: string;
  preview: string;
  time: string;
  received: string;
  unread: boolean;
  assigned: boolean;
  escalated: boolean;
  body: string[];
  attachment?: { name: string; size: string };
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "c-4821",
    name: "Priya Raghunathan",
    email: "priya.raghunathan@lumenfield-logistics.example",
    subject:
      "Bulk import of 12,400 supplier records keeps failing at the validation step after the March schema change",
    preview:
      "We ran the import again last night and it stopped at 3,180 records. Every rejected row has a value in secondary_contact.",
    time: "09:24",
    received: "14 Mar 2025, 09:24",
    unread: true,
    assigned: true,
    escalated: false,
    body: [
      "We ran the March supplier import last night and it stopped at 3,180 of 12,400 records. The job never fails outright, it sits at the validation step until the two-hour timeout and then reports a partial write.",
      "Every record it rejects has a value in the secondary_contact column. The same rows imported cleanly on 6 March, so I think this is related to the schema change you shipped on the 11th.",
      "I have attached the export we are using, trimmed to the first 500 rows so you can reproduce it without waiting for the full file. The shape is unchanged from the one we agreed at onboarding.",
      "Two questions. Is secondary_contact still accepted, and if it has moved, is there a mapping we should apply before the next run? We have another 9,000 records queued behind this one.",
      "For context on urgency: the queued records cover the four new depots we open on 24 March, and none of those suppliers can be dispatched against until they exist in Portway. Our planners are currently holding the lane assignments in a spreadsheet.",
      "If the fix has to wait for a release, a temporary import path that skips validation on that one column would unblock us. We can clean the data afterwards, and I would rather do that than keep the depots on manual entry for another week.",
      "The Rotterdam team needs them in place before Monday, so if a call today is faster than email I can make time from 14:00 onwards.",
    ],
    attachment: { name: "supplier-import-sample-500.csv", size: "2.4 MB" },
  },
  {
    id: "c-4820",
    name: "Daniel Okonkwo",
    email: "daniel.okonkwo@brightsea-freight.example",
    subject:
      "Rate card for the Rotterdam lane is showing last quarter's prices",
    preview:
      "Our dispatchers are quoting from a card that expired on 28 February. Nothing changed on our side, so I suspect the sync.",
    time: "08:51",
    received: "14 Mar 2025, 08:51",
    unread: true,
    assigned: false,
    escalated: false,
    body: [
      "Our dispatchers are quoting the Rotterdam to Duisburg lane from a rate card that expired on 28 February. Nothing changed on our side, so I suspect the nightly sync is not picking up the new card.",
      "The customer-facing quote tool shows the correct prices, which is the confusing part. It is only the dispatch board that is behind.",
      "We can work around it for a day or two by quoting manually, but I would rather not have twelve people copying numbers out of a spreadsheet.",
    ],
  },
  {
    id: "c-4819",
    name: "Marta Lindqvist",
    email: "m.lindqvist@nordkust.example",
    subject: "Two drivers cannot sign in after the SSO migration",
    preview:
      "Both accounts were created before we moved to Okta. They get sent back to the login screen with no error message.",
    time: "Yesterday",
    received: "13 Mar 2025, 16:07",
    unread: true,
    assigned: true,
    escalated: false,
    body: [
      "Two of our drivers cannot sign in to the mobile app after Tuesday's SSO migration. Both accounts were created before we moved to Okta.",
      "They get sent back to the login screen with no error message, which makes it hard for them to tell us what went wrong. Everyone else on the same team signs in fine.",
      "I have their employee numbers if that helps you find the accounts. Let me know what you need and I will get it to you today.",
    ],
  },
  {
    id: "c-4818",
    name: "Kenji Watanabe",
    email: "k.watanabe@harborline.example",
    subject: "Webhook retries are arriving out of order",
    preview:
      "We are seeing shipment.updated land before shipment.created for about one delivery in fifty. Our queue handles it, but the ordering guarantee in the docs says this should not happen.",
    time: "Yesterday",
    received: "13 Mar 2025, 11:42",
    unread: false,
    assigned: false,
    escalated: false,
    body: [
      "We are seeing shipment.updated arrive before shipment.created for roughly one delivery in fifty. Our queue tolerates it, but the ordering guarantee in your documentation says this should not happen.",
      "It started around the same time we increased our endpoint timeout from two to five seconds, so it may be on our side. I would like to rule out the retry logic first.",
      "Is there a way to see the delivery attempts for a single event without opening a ticket each time?",
    ],
  },
  {
    id: "c-4817",
    name: "Aisha Bello",
    email: "aisha.bello@sahelgroup.example",
    subject: "Read-only access for our finance team",
    preview:
      "Four people in finance need to see invoices and settlement reports without being able to change a shipment.",
    time: "Mon",
    received: "11 Mar 2025, 14:15",
    unread: false,
    assigned: true,
    escalated: false,
    body: [
      "Four people in our finance team need to see invoices and settlement reports without being able to change a shipment or a rate.",
      "The viewer role looks close, but it also hides the settlement export, which is the one thing they actually need.",
      "Is there a way to grant the export on its own, or should we be looking at a custom role?",
    ],
  },
  {
    id: "c-4816",
    name: "Tomás Ferreira",
    email: "tomas.ferreira@atlanticoport.example",
    subject: "Signed carrier agreement",
    preview: "",
    time: "Mon",
    received: "11 Mar 2025, 09:03",
    unread: false,
    assigned: false,
    escalated: false,
    body: [
      "Attached is the countersigned carrier agreement for the 2025 season. No changes from the draft you sent on 4 March.",
    ],
    attachment: { name: "carrier-agreement-2025-signed.pdf", size: "812 KB" },
  },
  {
    id: "c-4815",
    name: "Hannah Weiss",
    email: "h.weiss@genoa-forwarding.example",
    subject: "Customs documents missing from the Genoa shipment",
    preview:
      "Container GNOA-77412 arrived without the packing list attached in the portal. The paper copy travelled with the driver.",
    time: "12 Mar",
    received: "12 Mar 2025, 08:30",
    unread: false,
    assigned: false,
    escalated: false,
    body: [
      "Container GNOA-77412 arrived without the packing list attached in the portal. The paper copy travelled with the driver, so nothing was held up, but our broker needs the digital version for the file.",
      "The upload shows as complete in the shipment timeline, which is why nobody noticed until the container was already on the water.",
      "Can you check whether the document was stored and simply not linked?",
    ],
  },
  {
    id: "c-4814",
    name: "Oliver Grant",
    email: "oliver.grant@meadowbank.example",
    subject: "Invoice 2025-0418 was charged twice",
    preview:
      "Both charges cleared on 10 March for £4,280.00. Our bank shows two separate authorisations, not a pending and a capture.",
    time: "11 Mar",
    received: "11 Mar 2025, 17:48",
    unread: false,
    assigned: false,
    escalated: false,
    body: [
      "Invoice 2025-0418 was charged twice. Both charges cleared on 10 March for £4,280.00, and our bank shows two separate authorisations rather than a pending and a capture.",
      "I have the reference numbers for both if you need them. A refund of the duplicate would be ideal, but a credit against the April invoice works as well.",
    ],
  },
  {
    id: "c-4813",
    name: "Sofia Marchetti",
    email: "s.marchetti@viadria.example",
    subject: "Filter the dispatch board by trailer type",
    preview:
      "We run reefers and dry vans out of the same yard and the planners scroll past most of the board to find the right one.",
    time: "9 Mar",
    received: "9 Mar 2025, 10:12",
    unread: false,
    assigned: false,
    escalated: false,
    body: [
      "We run reefers and dry vans out of the same yard, and the planners scroll past most of the board to find the right trailer.",
      "A filter on trailer type would save each of them a few minutes every hour. Saved views would be even better, but the filter alone would be enough.",
      "Not urgent. I wanted to get it in front of you before the next planning cycle.",
    ],
  },
];

const OVERFLOW_ACTIONS: { label: string; icon: IconType }[] = [
  { label: "Mark as unread", icon: Inbox },
  { label: "Snooze until Monday", icon: Clock },
  { label: "Assign to a teammate", icon: UserPlus },
  { label: "Mute this sender", icon: Bell },
];

function useModalLayer(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  shouldFocusRef: MutableRefObject<boolean>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const doc = container?.ownerDocument ?? document;
    const getFocusable = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("disabled"));

    if (shouldFocusRef.current) {
      shouldFocusRef.current = false;
      (initialFocusRef?.current ?? getFocusable()[0])?.focus({
        preventScroll: true,
      });
    }

    const onKeyDown = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    doc.addEventListener("keydown", onKeyDown);
    return () => doc.removeEventListener("keydown", onKeyDown);
  }, [open, containerRef, onClose, shouldFocusRef, initialFocusRef]);
}

export default function AppShell5() {
  const [mailbox, setMailbox] = useState("inbox");
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(CONVERSATIONS[0].id);
  const [readIds, setReadIds] = useState<string[]>([CONVERSATIONS[0].id]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);

  const [navOpen, setNavOpen] = useState(false);
  const [navShown, setNavShown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuShown, setMenuShown] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmShown, setConfirmShown] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const navTriggerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const list = useScrollFade<HTMLDivElement>();
  const content = useScrollFade<HTMLDivElement>();
  const mailboxes = useScrollFade<HTMLUListElement>();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const focusNavRef = useRef(false);
  const focusConfirmRef = useRef(false);
  const focusDetailRef = useRef(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return CONVERSATIONS.filter((item) => {
      if (deletedIds.includes(item.id)) return false;
      if (filter === "Unread" && readIds.includes(item.id)) return false;
      if (filter === "Assigned" && !item.assigned) return false;
      if (filter === "Escalated" && !item.escalated) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.subject.toLowerCase().includes(needle) ||
        item.preview.toLowerCase().includes(needle)
      );
    });
  }, [deletedIds, filter, query, readIds]);

  const selected =
    CONVERSATIONS.find((item) => item.id === selectedId) ?? CONVERSATIONS[0];
  const filtersActive = filter !== "All" || query.trim().length > 0;

  const openConversation = (id: string, moveFocus: boolean) => {
    setSelectedId(id);
    setReadIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setDetailOpen(true);
    focusDetailRef.current = moveFocus;
  };

  useEffect(() => {
    if (!detailOpen || !focusDetailRef.current) return;
    focusDetailRef.current = false;
    const button = backRef.current;
    if (button && button.offsetParent !== null) {
      button.focus({ preventScroll: true });
    }
  }, [detailOpen, selectedId]);

  const closeDetail = () => {
    setDetailOpen(false);
    const row = listRef.current?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    row?.focus({ preventScroll: true });
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (visible.length === 0) return;
    const index = visible.findIndex((item) => item.id === selectedId);
    let next = index;
    if (event.key === "ArrowDown") {
      next = index < 0 ? 0 : Math.min(index + 1, visible.length - 1);
    } else if (event.key === "ArrowUp") {
      next = index <= 0 ? 0 : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = visible.length - 1;
    } else if (event.key === "Enter") {
      event.preventDefault();
      openConversation(selectedId, true);
      return;
    } else {
      return;
    }
    event.preventDefault();
    const id = visible[next].id;
    setSelectedId(id);
    setReadIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    listRef.current
      ?.querySelector<HTMLElement>(`[data-conversation="${id}"]`)
      ?.focus({ preventScroll: true });
  };

  const clearFilters = () => {
    setFilter("All");
    setQuery("");
    setDeletedIds([]);
  };

  const closeNav = useCallback(() => {
    setNavOpen(false);
    setNavShown(false);
    navTriggerRef.current?.focus({ preventScroll: true });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setConfirmShown(false);
    deleteTriggerRef.current?.focus({ preventScroll: true });
  }, []);

  useModalLayer(navOpen, navRef, closeNav, focusNavRef);
  useModalLayer(
    confirmOpen,
    confirmRef,
    closeConfirm,
    focusConfirmRef,
    cancelRef,
  );

  useEffect(() => {
    if (!navOpen) return;
    const frame = requestAnimationFrame(() => setNavShown(true));
    return () => cancelAnimationFrame(frame);
  }, [navOpen]);

  useEffect(() => {
    if (!confirmOpen) return;
    const frame = requestAnimationFrame(() => setConfirmShown(true));
    return () => cancelAnimationFrame(frame);
  }, [confirmOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const node = menuWrapRef.current;
    const doc = node?.ownerDocument ?? document;
    const frame = requestAnimationFrame(() => setMenuShown(true));

    const closeMenu = (restoreFocus: boolean) => {
      setMenuOpen(false);
      setMenuShown(false);
      if (restoreFocus) menuTriggerRef.current?.focus({ preventScroll: true });
    };

    const onPointerDown = (event: Event) => {
      if (!node?.contains(event.target as Node)) closeMenu(false);
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
          [],
      );
      if (items.length === 0) return;
      const index = items.indexOf(doc.activeElement as HTMLElement);
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        items[index < 0 || index === items.length - 1 ? 0 : index + 1]?.focus({
          preventScroll: true,
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[index <= 0 ? items.length - 1 : index - 1]?.focus({
          preventScroll: true,
        });
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus({ preventScroll: true });
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus({ preventScroll: true });
      }
    };

    doc.addEventListener("pointerdown", onPointerDown);
    doc.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      doc.removeEventListener("pointerdown", onPointerDown);
      doc.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const confirmDelete = () => {
    const remaining = visible.filter((item) => item.id !== selected.id);
    setDeletedIds((ids) => [...ids, selected.id]);
    setSelectedId(remaining[0]?.id ?? CONVERSATIONS[0].id);
    setConfirmOpen(false);
    setConfirmShown(false);
    setDetailOpen(false);
    navTriggerRef.current?.focus({ preventScroll: true });
  };

  const starred = starredIds.includes(selected.id);

  return (
    <div className="relative flex h-full min-h-[720px] w-full overflow-hidden bg-white dark:bg-neutral-950">
      <div className="hidden w-14 shrink-0 flex-col items-center bg-neutral-50 pb-3 lg:flex dark:bg-neutral-900">
        <div className="flex h-14 shrink-0 items-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-sm font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]">
            P
          </span>
        </div>

        <nav aria-label="Mailboxes">
          <ul className="flex flex-col items-center gap-1">
            {MAILBOXES.map(({ id, label, icon: Icon, unread }) => {
              const current = id === mailbox;
              return (
                <li key={id} className="relative">
                  <button
                    type="button"
                    aria-label={label}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setMailbox(id)}
                    className={cx(
                      "peer relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] active:scale-[0.97]",
                      current
                        ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                      transition,
                      focus,
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {unread && (
                      <>
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]" />
                        <span className="sr-only">Unread</span>
                      </>
                    )}
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 z-[70] ml-2 inline-flex h-7 origin-left -translate-y-1/2 scale-95 items-center whitespace-nowrap rounded-[var(--rb-r-sm,6px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-2 text-xs text-[var(--rb-accent-fg,oklch(100%_0_0))] opacity-0 transition-[opacity,transform] duration-[125ms] ease-out peer-hover:scale-100 peer-hover:opacity-100 peer-focus-visible:scale-100 peer-focus-visible:opacity-100 motion-reduce:transition-none dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="relative mt-auto">
          <button
            type="button"
            aria-label="Iris Renner, support lead"
            className={cx(
              "peer flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-300 active:scale-[0.97] dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600",
              transition,
              focus,
            )}
          >
            IR
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-1 left-full z-[70] ml-2 inline-flex h-7 origin-left scale-95 items-center whitespace-nowrap rounded-[var(--rb-r-sm,6px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-2 text-xs text-[var(--rb-accent-fg,oklch(100%_0_0))] opacity-0 transition-[opacity,transform] duration-[125ms] ease-out peer-hover:scale-100 peer-hover:opacity-100 peer-focus-visible:scale-100 peer-focus-visible:opacity-100 motion-reduce:transition-none dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
          >
            Iris Renner
          </span>
        </div>
      </div>

      <section
        aria-labelledby="app-shell-5-list-heading"
        className={cx(
          "w-full min-w-0 flex-col border-r border-neutral-200/70 lg:w-80 lg:shrink-0 xl:w-96 dark:border-neutral-800",
          detailOpen ? "hidden lg:flex" : "flex",
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <button
            ref={navTriggerRef}
            type="button"
            aria-label="Open mailboxes"
            aria-expanded={navOpen}
            onClick={() => {
              focusNavRef.current = true;
              setNavOpen(true);
            }}
            className={cx(tertiaryIcon, transition, focus, "lg:hidden")}
          >
            <Menu aria-hidden="true" className="h-4 w-4" />
          </button>
          <h2
            id="app-shell-5-list-heading"
            className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
          >
            Inbox
          </h2>
          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
            {visible.length}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Sort conversations"
              className={cx(tertiaryIcon, transition, focus)}
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Compose a reply"
              className={cx(tertiaryIcon, transition, focus)}
            >
              <Reply aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative shrink-0 px-3">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          />
          <label htmlFor="app-shell-5-search" className="sr-only">
            Search conversations
          </label>
          <input
            id="app-shell-5-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            className={cx(
              "h-9 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 placeholder:text-neutral-500 hover:border-neutral-300 focus:border-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-neutral-700 dark:focus:border-white",
              transition,
              focus,
            )}
          />
        </div>

        <div
          role="radiogroup"
          aria-label="Filter conversations"
          className="flex shrink-0 items-center gap-1.5 px-3 py-2.5"
        >
          {FILTERS.map((item) => {
            const active = item === filter;
            return (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setFilter(item)}
                className={cx(
                  "inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] px-2.5 text-[13px] font-medium active:scale-[0.97]",
                  active
                    ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
                  transition,
                  focus,
                )}
              >
                {item}
              </button>
            );
          })}
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={list.ref}
            onScroll={list.onScroll}
            className="h-full overflow-y-auto"
          >
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                  <Inbox
                    aria-hidden="true"
                    className="h-5 w-5 text-neutral-500"
                  />
                </div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {filtersActive ? "No conversations match" : "Inbox is empty"}
                </p>
                <p className="mt-1 max-w-xs text-xs text-neutral-600 dark:text-neutral-400">
                  {filtersActive
                    ? "Nothing in this mailbox matches the current search and filter."
                    : "Everything here has been deleted. Restore it if that was a mistake."}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className={cx(
                    "mt-4 inline-flex h-8 cursor-pointer items-center rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-2.5 text-[13px] font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.97] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
                    transition,
                    focus,
                  )}
                >
                  {filtersActive ? "Clear filters" : "Restore conversations"}
                </button>
              </div>
            ) : (
              <ul
                ref={listRef}
                role="listbox"
                aria-label="Conversations"
                onKeyDown={onListKeyDown}
                className="divide-y divide-neutral-100 dark:divide-neutral-800/70"
              >
                {visible.map((item) => {
                  const isSelected = item.id === selected.id;
                  const isUnread = !readIds.includes(item.id);
                  return (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        data-conversation={item.id}
                        onClick={() => openConversation(item.id, true)}
                        className={cx(
                          "flex w-full cursor-pointer gap-3 border-l-2 px-3 py-2.5 text-left",
                          isSelected
                            ? "border-neutral-900 bg-neutral-100 dark:border-white dark:bg-neutral-800"
                            : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                          transition,
                          focusInset,
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className={cx(
                              "block truncate text-[13px]",
                              isUnread
                                ? "font-medium text-neutral-900 dark:text-neutral-100"
                                : "text-neutral-600 dark:text-neutral-400",
                            )}
                          >
                            {item.name}
                          </span>
                          <span
                            className={cx(
                              "mt-0.5 block truncate text-[13px]",
                              isUnread
                                ? "font-medium text-neutral-900 dark:text-neutral-100"
                                : "text-neutral-900 dark:text-neutral-100",
                            )}
                          >
                            {item.subject}
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
                            {item.preview || "-"}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                            {item.time}
                          </span>
                          <span
                            className={cx(
                              "h-1.5 w-1.5 rounded-full",
                              isUnread
                                ? "bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]"
                                : "bg-transparent",
                            )}
                          />
                          {isUnread && <span className="sr-only">Unread</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              list.edges.start ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              list.edges.end ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </section>

      <main
        className={cx(
          "min-w-0 flex-1 flex-col",
          detailOpen ? "flex" : "hidden lg:flex",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 px-4 sm:px-6">
          <button
            ref={backRef}
            type="button"
            aria-label="Back to conversations"
            onClick={closeDetail}
            className={cx(tertiaryIcon, transition, focus, "lg:hidden")}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
            {selected.subject}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Reply"
              className={cx(tertiaryIcon, transition, focus)}
            >
              <Reply aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={starred ? "Remove star" : "Star this conversation"}
              aria-pressed={starred}
              onClick={() =>
                setStarredIds((ids) =>
                  ids.includes(selected.id)
                    ? ids.filter((id) => id !== selected.id)
                    : [...ids, selected.id],
                )
              }
              className={cx(tertiaryIconFromSm, transition, focus)}
            >
              <Star
                aria-hidden="true"
                className={cx("h-4 w-4", starred && "fill-current")}
              />
            </button>
            <button
              type="button"
              aria-label="Archive"
              className={cx(tertiaryIconFromSm, transition, focus)}
            >
              <Archive aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              ref={deleteTriggerRef}
              type="button"
              aria-label="Delete"
              onClick={() => {
                focusConfirmRef.current = true;
                setConfirmOpen(true);
              }}
              className={cx(tertiaryIconFromSm, transition, focus)}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
            <div ref={menuWrapRef} className="relative">
              <button
                ref={menuTriggerRef}
                type="button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => {
                  if (menuOpen) {
                    setMenuOpen(false);
                    setMenuShown(false);
                  } else {
                    setMenuOpen(true);
                  }
                }}
                className={cx(tertiaryIcon, transition, focus)}
              >
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="More actions"
                  className={cx(
                    "absolute right-0 top-full z-30 mt-1 w-56 origin-top-right rounded-[var(--rb-r-2xl,14px)] border border-neutral-200 bg-white p-1 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.10)] transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none",
                    menuShown ? "scale-100 opacity-100" : "scale-95 opacity-0",
                  )}
                >
                  {OVERFLOW_ACTIONS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        setMenuShown(false);
                        menuTriggerRef.current?.focus({ preventScroll: true });
                      }}
                      className={cx(
                        "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[var(--rb-r-lg,10px)] px-2 text-left text-[13px] text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                        transition,
                        focusInset,
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-neutral-500"
                      />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <div
            ref={content.ref}
            onScroll={content.onScroll}
            className="h-full overflow-y-auto p-4 sm:p-6"
          >
            <div className="max-w-3xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {selected.name}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-neutral-500 dark:text-neutral-500">
                    {selected.email}
                  </p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                  {selected.received}
                </p>
              </div>
              <p className="mt-2 text-[13px] text-neutral-500 dark:text-neutral-500">
                To Portway support
              </p>

              <div className="mt-5 space-y-4 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
                {selected.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {selected.attachment && (
                <div className="mt-6">
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    Attachment
                  </p>
                  <div className="mt-2 flex items-center gap-3 rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-100 dark:bg-neutral-800">
                      <FileText
                        aria-hidden="true"
                        className="h-4 w-4 text-neutral-600 dark:text-neutral-400"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                        {selected.attachment.name}
                      </span>
                      <span className="block text-xs tabular-nums text-neutral-500 dark:text-neutral-500">
                        {selected.attachment.size}
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Download ${selected.attachment.name}`}
                      className={cx(tertiaryIcon, transition, focus)}
                    >
                      <Download aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              content.edges.start ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden="true"
            className={cx(
              "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-950",
              content.edges.end ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </main>

      {navOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close mailboxes overlay"
            tabIndex={-1}
            onClick={closeNav}
            className={cx(
              "absolute inset-0 z-30 cursor-pointer bg-neutral-950/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out dark:bg-neutral-950/60",
              navShown ? "opacity-100" : "opacity-0",
            )}
          />
          <nav
            ref={navRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mailboxes"
            className={cx(
              "absolute inset-y-0 left-0 z-40 flex w-64 max-w-[85%] flex-col rounded-r-[var(--rb-r-4xl,18px)] bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] transition-transform duration-[320ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none dark:bg-neutral-900 dark:shadow-none",
              navShown ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-14 shrink-0 items-center gap-2.5 pl-3 pr-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] text-sm font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]">
                P
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100">
                Portway
              </p>
              <button
                type="button"
                aria-label="Close mailboxes"
                onClick={closeNav}
                className={cx(tertiaryIcon, transition, focus)}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <ul
                ref={mailboxes.ref}
                onScroll={mailboxes.onScroll}
                className="h-full space-y-0.5 overflow-y-auto px-2 pb-3"
              >
                {MAILBOXES.map(({ id, label, icon: Icon, unread }) => {
                  const current = id === mailbox;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-current={current ? "page" : undefined}
                        onClick={() => {
                          setMailbox(id);
                          closeNav();
                        }}
                        className={cx(
                          "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[var(--rb-r-md,8px)] px-3 text-[13px]",
                          current
                            ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                          transition,
                          focus,
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-neutral-500"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {label}
                        </span>
                        {unread && (
                          <>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rb-accent,oklch(20.5%_0_0))] dark:bg-[var(--rb-accent,oklch(100%_0_0))]" />
                            <span className="sr-only">Unread</span>
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
                  mailboxes.edges.start ? "opacity-100" : "opacity-0",
                )}
              />
              <div
                aria-hidden="true"
                className={cx(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent transition-opacity duration-200 ease-out dark:from-neutral-900",
                  mailboxes.edges.end ? "opacity-100" : "opacity-0",
                )}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2.5 bg-neutral-100/70 p-2 dark:bg-neutral-800/40">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                IR
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                  Iris Renner
                </span>
                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-500">
                  Support lead
                </span>
              </span>
            </div>
          </nav>
        </div>
      )}

      {confirmOpen && (
        <>
          <div
            className={cx(
              "absolute inset-0 z-40 bg-neutral-950/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out dark:bg-neutral-950/60",
              confirmShown ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            ref={confirmRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-shell-5-confirm-title"
            aria-describedby="app-shell-5-confirm-body"
            className={cx(
              "absolute left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--rb-r-4xl,18px)] border border-neutral-200 bg-white p-5 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.18)] transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none",
              confirmShown ? "scale-100 opacity-100" : "scale-[0.97] opacity-0",
            )}
          >
            <h2
              id="app-shell-5-confirm-title"
              className="text-base font-medium tracking-[-0.01em] text-neutral-900 dark:text-neutral-100"
            >
              Delete the thread from {selected.name}?
            </h2>
            <p
              id="app-shell-5-confirm-body"
              className="mt-1.5 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              It moves to trash and leaves the shared inbox for everyone on the
              team.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={closeConfirm}
                className={cx(
                  "inline-flex h-9 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.97] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800",
                  transition,
                  focus,
                )}
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[var(--rb-r-md,8px)] bg-red-600 px-3 text-sm font-medium text-white transition-[background-color,border-color,color,transform] duration-150 ease-out hover:bg-red-700 active:scale-[0.97] focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:hover:bg-red-500"
              >
                Delete conversation
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
