import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Image as ImageIcon,
  Calendar,
  Clock,
  DollarSign,
  Map,
  Train,
  Hotel,
  Utensils,
  Info,
  Navigation,
  Sun,
  Camera,
  ShoppingBag,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  X,
  CheckCircle2
} from "lucide-react";

const FALLBACK_STORAGE_KEY = "taiwan-trip-data";
const FOOD_MAP_LINK = "https://maps.app.goo.gl/vqVtp8xpzP4ARY4N7";
const getFoodMapSearchUrl = (name) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} Taipei Taiwan`)}`;
const FOOD_SUGGESTED_ITEMS = [
  {
    id: "food-list-1",
    name: "CREMIA Hokkaido Ice-cream (Taipei)",
    rating: "4.2",
    reviews: "262",
    price: "N/A",
    category: "Ice Cream"
  },
  {
    id: "food-list-2",
    name: "Mama Cane",
    rating: "3.2",
    reviews: "145",
    price: "TWD 1-200",
    category: "Ice cream and drink shop"
  },
  {
    id: "food-list-3",
    name: "Smoothie House",
    rating: "3.7",
    reviews: "5,143",
    price: "N/A",
    category: "Ice Cream"
  },
  {
    id: "food-list-4",
    name: "SUNMERRY Dongmen Shop",
    rating: "3.8",
    reviews: "1,245",
    price: "TWD 1-200",
    category: "Bakery"
  },
  {
    id: "food-list-5",
    name: "Hao Kung Tao Chin Chi Yuan (Da'an)",
    rating: "4.0",
    reviews: "4,123",
    price: "TWD 200-400",
    category: "Dim Sum"
  },
  {
    id: "food-list-6",
    name: "MACU Tea Xinyi",
    rating: "4.0",
    reviews: "915",
    price: "$",
    category: "Bubble Tea"
  },
  {
    id: "food-list-7",
    name: "Beef noodle of the King",
    rating: "4.1",
    reviews: "5,237",
    price: "TWD 1-200",
    category: "Chinese Noodles"
  }
];

const getTypeIcon = (type) => {
  switch (type) {
    case "transport":
      return <Train className="w-5 h-5 text-blue-500" />;
    case "hotel":
      return <Hotel className="w-5 h-5 text-indigo-500" />;
    case "food":
      return <Utensils className="w-5 h-5 text-orange-500" />;
    case "camera":
      return <Camera className="w-5 h-5 text-teal-500" />;
    case "sun":
      return <Sun className="w-5 h-5 text-yellow-500" />;
    case "shopping":
      return <ShoppingBag className="w-5 h-5 text-pink-500" />;
    case "info":
      return <Info className="w-5 h-5 text-gray-500" />;
    default:
      return <MapPin className="w-5 h-5 text-slate-500" />;
  }
};

const getNoteItems = (desc) => {
  if (!desc) return [];

  const normalized = desc.replace(/\t+/g, " ").trim();
  if (!normalized) return [];

  const hasManualLines = normalized.includes("\n");
  const rawItems = hasManualLines
    ? normalized.split(/\n+/)
    : normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);

  return rawItems
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
};

export default function App() {
  const [exchangeRate, setExchangeRate] = useState(22.5);
  const [itineraryData, setItineraryData] = useState([]);
  const [activeMainTab, setActiveMainTab] = useState("planning");
  const [toastState, setToastState] = useState({ message: "", undoAction: null });
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isQuickJumpVisible, setIsQuickJumpVisible] = useState(true);
  const [activeViewedDayIdx, setActiveViewedDayIdx] = useState(0);
  const toastTimerRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [activeDayIdx, setActiveDayIdx] = useState(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "" });
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    time: "",
    title: "",
    desc: "",
    movingTime: "",
    costTWD: 0,
    type: "map",
    query: ""
  });
  const [dayFormData, setDayFormData] = useState({
    date: "",
    dayOfWeek: "",
    location: ""
  });
  const confirmActionRef = useRef(null);

  const showToast = (msg, undoAction = null) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToastState({ message: msg, undoAction });
    toastTimerRef.current = setTimeout(() => {
      setToastState({ message: "", undoAction: null });
      toastTimerRef.current = null;
    }, 4000);
  };

  const handleUndoFromToast = () => {
    const action = toastState.undoAction;
    if (!action) return;
    action();
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastState({ message: "", undoAction: null });
  };

  const requestConfirm = (message, onConfirm) => {
    confirmActionRef.current = onConfirm;
    setConfirmDialog({ open: true, message });
  };

  const handleConfirmCancel = () => {
    confirmActionRef.current = null;
    setConfirmDialog({ open: false, message: "" });
  };

  const handleConfirmProceed = () => {
    const action = confirmActionRef.current;
    confirmActionRef.current = null;
    setConfirmDialog({ open: false, message: "" });
    if (action) action();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/api/itinerary");
        if (!response.ok) {
          throw new Error("API response not OK");
        }

        const data = await response.json();
        setItineraryData(data);
      } catch {
        const fallbackData = localStorage.getItem(FALLBACK_STORAGE_KEY);
        if (fallbackData) {
          try {
            setItineraryData(JSON.parse(fallbackData));
            showToast("Loaded local backup data.");
          } catch {
            showToast("Cannot read local backup data.");
          }
        } else {
          showToast("Cannot load server data. Please check backend.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const persistItineraryData = async (newData, successMessage) => {
    setItineraryData(newData);
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(newData));

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData)
      });

      if (!response.ok) {
        throw new Error("Cannot save to API");
      }

      if (successMessage) {
        showToast(successMessage);
      }
    } catch {
      showToast("Saved local backup only (server unavailable).");
    }
  };

  const openAddModal = (dayIdx) => {
    if (!isEditMode) return;
    setActiveDayIdx(dayIdx);
    setModalMode("add");
    setFormData({
      id: `ev-${Date.now()}`,
      time: "",
      title: "",
      desc: "",
      movingTime: "",
      costTWD: 0,
      type: "camera",
      query: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (dayIdx, event) => {
    if (!isEditMode) return;
    setActiveDayIdx(dayIdx);
    setModalMode("edit");
    setFormData({ movingTime: "", ...event });
    setIsModalOpen(true);
  };

  const openAddDayModal = () => {
    if (!isEditMode) return;
    setDayFormData({
      date: "",
      dayOfWeek: "",
      location: ""
    });
    setIsDayModalOpen(true);
  };

  const handleDeleteEvent = (dayIdx, eventId) => {
    if (!isEditMode) return;
    requestConfirm("Are you sure you want to delete this event?", () => {
      const newData = [...itineraryData];
      const deleteIndex = newData[dayIdx].events.findIndex((ev) => ev.id === eventId);
      if (deleteIndex === -1) return;

      const [deletedEvent] = newData[dayIdx].events.splice(deleteIndex, 1);
      void persistItineraryData(newData);
      showToast("Event deleted!", () => {
        const restoredData = newData.map((day) => ({
          ...day,
          events: [...day.events]
        }));

        if (!restoredData[dayIdx]) return;
        restoredData[dayIdx].events.splice(deleteIndex, 0, deletedEvent);
        void persistItineraryData(restoredData, "Undo successful: event restored.");
      });
    });
  };

  const handleDeleteDay = (dayIdx) => {
    if (!isEditMode) return;
    const day = itineraryData[dayIdx];
    if (!day) return;

    requestConfirm(`Delete ${day.dayOfWeek} (${day.date}) and all events in this day?`, () => {
      const deletedDay = itineraryData[dayIdx];
      const newData = itineraryData.filter((_item, idx) => idx !== dayIdx);
      void persistItineraryData(newData);
      showToast("Day deleted with all events!", () => {
        const restoredData = [...newData];
        restoredData.splice(dayIdx, 0, deletedDay);
        void persistItineraryData(restoredData, "Undo successful: day restored.");
      });
    });
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!isEditMode) return;
    const newData = [...itineraryData];

    if (modalMode === "add") {
      newData[activeDayIdx].events.push(formData);
    } else {
      const eventIdx = newData[activeDayIdx].events.findIndex((ev) => ev.id === formData.id);
      if (eventIdx !== -1) {
        newData[activeDayIdx].events[eventIdx] = formData;
      }
    }

    void persistItineraryData(newData, modalMode === "add" ? "Event added!" : "Event updated!");
    setIsModalOpen(false);
  };

  const handleAddDaySubmit = (e) => {
    e.preventDefault();
    if (!isEditMode) return;

    const newDay = {
      date: dayFormData.date.trim(),
      dayOfWeek: dayFormData.dayOfWeek.trim(),
      location: dayFormData.location.trim(),
      events: []
    };

    const newData = [...itineraryData, newDay];
    const newDayIdx = newData.length - 1;
    void persistItineraryData(newData, "New day added!");
    setIsDayModalOpen(false);
    setActiveViewedDayIdx(newDayIdx);
    setTimeout(() => {
      scrollToDay(newDayIdx);
    }, 120);
  };

  const handleEventDragStart = (fromDayIdx, eventId) => {
    if (!isEditMode) return;
    setDraggingEvent({ fromDayIdx, eventId });
  };

  const handleEventDragEnd = () => {
    setDraggingEvent(null);
    setDropTarget(null);
  };

  const moveEventToTarget = (toDayIdx, toEventId = null) => {
    if (!isEditMode) return;
    if (!draggingEvent) return;

    const { fromDayIdx, eventId } = draggingEvent;

    if (fromDayIdx === toDayIdx && toEventId === eventId) {
      handleEventDragEnd();
      return;
    }

    const newData = itineraryData.map((day) => ({
      ...day,
      events: [...day.events]
    }));

    const sourceEvents = newData[fromDayIdx]?.events;
    if (!sourceEvents) {
      handleEventDragEnd();
      return;
    }

    const sourceEventIndex = sourceEvents.findIndex((event) => event.id === eventId);
    if (sourceEventIndex === -1) {
      handleEventDragEnd();
      return;
    }

    const [movingEvent] = sourceEvents.splice(sourceEventIndex, 1);
    const destinationEvents = newData[toDayIdx]?.events;
    if (!destinationEvents) {
      handleEventDragEnd();
      return;
    }

    if (toEventId) {
      const targetEventIndex = destinationEvents.findIndex((event) => event.id === toEventId);
      if (targetEventIndex === -1) {
        destinationEvents.push(movingEvent);
      } else {
        destinationEvents.splice(targetEventIndex, 0, movingEvent);
      }
    } else {
      destinationEvents.push(movingEvent);
    }

    void persistItineraryData(
      newData,
      fromDayIdx === toDayIdx ? "Event reordered!" : "Event moved to another day!"
    );
    handleEventDragEnd();
  };

  const handleDragOverTarget = (e, toDayIdx, toEventId = null) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDropTarget(`${toDayIdx}:${toEventId || "end"}`);
  };

  const handleDropOnTarget = (e, toDayIdx, toEventId = null) => {
    if (!isEditMode) return;
    e.preventDefault();
    moveEventToTarget(toDayIdx, toEventId);
  };

  useEffect(() => {
    if (isEditMode) return;
    setIsModalOpen(false);
    setIsDayModalOpen(false);
    setConfirmDialog({ open: false, message: "" });
    confirmActionRef.current = null;
    setDraggingEvent(null);
    setDropTarget(null);
  }, [isEditMode]);

  const scrollToDay = (dayIdx) => {
    setActiveViewedDayIdx(dayIdx);
    const section = document.getElementById(`day-${dayIdx}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (!itineraryData.length) {
      setActiveViewedDayIdx(0);
      return;
    }

    if (activeViewedDayIdx > itineraryData.length - 1) {
      setActiveViewedDayIdx(itineraryData.length - 1);
    }

    const sections = itineraryData
      .map((_, idx) => document.getElementById(`day-${idx}`))
      .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) return;

        const topEntry = visibleEntries[0];
        const targetIdx = Number(topEntry.target.getAttribute("data-day-idx"));
        if (!Number.isNaN(targetIdx)) {
          setActiveViewedDayIdx(targetIdx);
        }
      },
      {
        root: null,
        rootMargin: "-130px 0px -50% 0px",
        threshold: [0.2, 0.5, 0.8]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [itineraryData, activeViewedDayIdx]);

  const totalTWD = useMemo(() => {
    return itineraryData.reduce((acc, day) => {
      return acc + day.events.reduce((sum, ev) => sum + (Number(ev.costTWD) || 0), 0);
    }, 0);
  }, [itineraryData]);

  const totalAUD = (totalTWD / exchangeRate).toFixed(2);
  const formatAUD = (twd) => (twd / exchangeRate).toFixed(2);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-500 font-medium">
        Loading itinerary...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 relative">
      {toastState.message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-medium text-sm">{toastState.message}</span>
          {toastState.undoAction && (
            <button
              onClick={handleUndoFromToast}
              className="ml-2 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              Undo
            </button>
          )}
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                Taiwan Trip 2026
              </h1>
              <p className="text-sm md:text-base text-slate-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> 12/06/2026 - 19/06/2026
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Exchange Rate TWD/AUD</span>
                  <div className="flex items-center text-sm font-medium bg-white px-2 py-1 rounded border border-blue-200">
                    <span>1 AUD = </span>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                      className="w-16 ml-1 outline-none text-blue-700 font-bold bg-transparent"
                      step="0.1"
                    />
                    <span>TWD</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const nextMode = !isEditMode;
                  setIsEditMode(nextMode);
                  showToast(nextMode ? "Edit mode enabled." : "Edit mode disabled.");
                }}
                className={`px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm ${
                  isEditMode
                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
              >
                <Edit2 className="w-5 h-5" />
                {isEditMode ? "Editing ON" : "Edit Mode"}
              </button>
              {isEditMode && (
                <button
                  onClick={openAddDayModal}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Add Day
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-fit">
            <button
              onClick={() => setActiveMainTab("planning")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeMainTab === "planning" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Planning Trip
            </button>
            <button
              onClick={() => setActiveMainTab("food")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeMainTab === "food" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Food Must Try
            </button>
          </div>
        </div>
      </header>

      {activeMainTab === "planning" && (
        <main className="max-w-6xl mx-auto px-4 mt-6 md:mt-8">
          <div className="mb-3 flex justify-end">
            <button
              onClick={() => setIsQuickJumpVisible((prev) => !prev)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              {isQuickJumpVisible ? "Hide Quick Jump" : "Show Quick Jump"}
            </button>
          </div>

          {isQuickJumpVisible && (
            <div className="mb-4 overflow-x-auto md:hidden">
              <div className="flex gap-2 pb-2">
                {itineraryData.map((day, dIdx) => (
                  <button
                    key={`mobile-jump-${day.date}-${dIdx}`}
                    onClick={() => scrollToDay(dIdx)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      activeViewedDayIdx === dIdx
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                    }`}
                  >
                    {day.dayOfWeek} - {day.date}
                  </button>
                ))}
              </div>
            </div>
          )}

        <div className={`md:flex md:items-start ${isQuickJumpVisible ? "md:gap-6" : ""}`}>
          {isQuickJumpVisible && (
            <aside className="hidden md:block w-64 shrink-0 sticky top-[110px]">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Jump</h3>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {itineraryData.map((day, dIdx) => (
                    <button
                      key={`jump-${day.date}-${dIdx}`}
                      onClick={() => scrollToDay(dIdx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                        activeViewedDayIdx === dIdx
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                      }`}
                    >
                      <div className="text-xs font-semibold">{day.dayOfWeek}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{day.date}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">{day.location}</div>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          <section className="flex-1">
        <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-4">
          <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full flex-shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Estimated Total Cost</h3>
            <div className="flex items-end gap-3 mt-1">
              <span className="text-2xl font-black text-emerald-600">{totalTWD.toLocaleString()} TWD</span>
              <span className="text-lg font-medium text-slate-400 mb-0.5">≈ {totalAUD} AUD</span>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {itineraryData.map((day, dIdx) => (
            <div
              key={`${day.date}-${dIdx}`}
              id={`day-${dIdx}`}
              data-day-idx={dIdx}
              className="relative group scroll-mt-[150px] md:scroll-mt-[120px]"
            >
              <div className="flex items-center gap-3 mb-4 sticky top-[130px] md:top-[100px] z-20 bg-slate-50/95 backdrop-blur py-2">
                <div className="bg-blue-600 text-white font-bold px-4 py-1.5 rounded-full text-sm md:text-base shadow-sm">
                  {day.dayOfWeek}
                </div>
                <div className="font-semibold text-slate-700 text-sm md:text-base">{day.date}</div>
                <div className="flex-1 h-px bg-slate-200 ml-2 hidden md:block"></div>
                <div className="font-bold text-slate-800 ml-auto bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm flex items-center gap-1.5 shadow-sm">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  {day.location}
                </div>
                {isEditMode && (
                  <button
                    onClick={() => handleDeleteDay(dIdx)}
                    className="p-1.5 rounded-md bg-slate-100 hover:bg-rose-100 text-rose-600 transition-colors"
                    title="Delete this day"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ml-2 md:ml-6 relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 z-0 hidden md:block"></div>
                <div className="divide-y divide-slate-100">
                  {day.events.map((event) => (
                    <div
                      key={event.id}
                      draggable={isEditMode}
                      onDragStart={() => handleEventDragStart(dIdx, event.id)}
                      onDragEnd={handleEventDragEnd}
                      onDragOver={(e) => handleDragOverTarget(e, dIdx, event.id)}
                      onDrop={(e) => handleDropOnTarget(e, dIdx, event.id)}
                      className={`p-4 md:p-6 relative z-10 flex flex-col md:flex-row gap-4 md:gap-6 hover:bg-slate-50 transition-colors group/event ${
                        draggingEvent?.eventId === event.id ? "opacity-60" : ""
                      } ${dropTarget === `${dIdx}:${event.id}` ? "ring-2 ring-blue-200 bg-blue-50/40" : ""}`}
                    >
                      {isEditMode && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover/event:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(dIdx, event)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(dIdx, event.id)}
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 text-rose-600 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center md:items-start md:flex-col md:w-32 flex-shrink-0 gap-3 md:gap-2">
                        {isEditMode && (
                          <div className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-50 border-4 border-white shadow flex items-center justify-center shrink-0">
                          {getTypeIcon(event.type)}
                        </div>
                        <div className="font-bold text-slate-700 text-sm md:text-base flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400 md:hidden" />
                          {event.time}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-16 md:pr-0">
                        <h4 className="text-lg font-bold text-slate-900 leading-snug">{event.title}</h4>
                        {event.movingTime && (
                          <div className="inline-flex items-center gap-1.5 mt-2 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-sm font-semibold border border-blue-100">
                            <Clock className="w-4 h-4" />
                            Moving time: {event.movingTime}
                          </div>
                        )}
                        {event.desc && (
                          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                            {getNoteItems(event.desc).map((note, idx) => (
                              <li key={`${event.id}-note-${idx}`} className="flex items-start gap-2 leading-relaxed">
                                <span className="text-slate-400 mt-[2px]">•</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {Number(event.costTWD) > 0 && (
                          <div className="inline-flex items-center gap-1.5 mt-3 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-sm font-semibold border border-rose-100">
                            <DollarSign className="w-4 h-4" />
                            {Number(event.costTWD).toLocaleString()} TWD
                            <span className="text-rose-400 font-normal ml-1">(~{formatAUD(event.costTWD)} AUD)</span>
                          </div>
                        )}

                        {event.query && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.query} Taiwan`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                            >
                              <Map className="w-3.5 h-3.5" /> Map
                            </a>
                            <a
                              href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${event.query} Taiwan`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-600 text-slate-600 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Images
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isEditMode && (
                    <div
                      onDragOver={(e) => handleDragOverTarget(e, dIdx)}
                      onDrop={(e) => handleDropOnTarget(e, dIdx)}
                      className={`p-4 md:px-6 bg-slate-50/50 transition-colors ${
                        dropTarget === `${dIdx}:end` ? "bg-blue-50" : ""
                      }`}
                    >
                      <button
                        onClick={() => openAddModal(dIdx)}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-5 h-5" /> Add event to {day.dayOfWeek}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
          </section>
        </div>
        </main>
      )}

      {activeMainTab === "food" && (
        <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-6 h-6 text-orange-500" />
              Food Must Try
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              This tab uses your shared Google Maps food list as the source of truth.
              Open the list to view the latest saved places and plan stops during the trip.
            </p>

            <a
              href={FOOD_MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-4 items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open Food Map List
            </a>
          </div>

          <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-6">
            <h3 className="font-bold text-slate-800 mb-3">Suggested Must-Try Items</h3>
            <div className="space-y-3">
              {FOOD_SUGGESTED_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={getFoodMapSearchUrl(item.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="font-semibold text-slate-900 flex items-center justify-between gap-2">
                    <span>{item.name}</span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">Open Map</span>
                  </div>
                  <div className="text-sm text-slate-700 mt-1">
                    Rating: {item.rating} ({item.reviews} reviews)
                  </div>
                  <div className="text-sm text-slate-600 mt-0.5">
                    Price: {item.price} · Category: {item.category}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </main>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{modalMode === "add" ? "Add New Event" : "Edit Event"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Time</label>
                  <input
                    required
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="e.g., 08:00 or Morning"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Event Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="transport">Transport (Train, Bus)</option>
                    <option value="hotel">Hotel</option>
                    <option value="food">Food / Dining</option>
                    <option value="camera">Sightseeing (Camera)</option>
                    <option value="sun">Scenery (Sun)</option>
                    <option value="shopping">Shopping</option>
                    <option value="map">General Map</option>
                    <option value="info">Information / Note</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Title (Location Name)</label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Explore Taipei 101"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Details / Notes</label>
                <textarea
                  rows="3"
                  value={formData.desc}
                  onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                  placeholder={"One bullet per line, e.g.\n- Train ticket booked\n- Bring cash for market"}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Moving / Transport Time</label>
                <input
                  type="text"
                  value={formData.movingTime}
                  onChange={(e) => setFormData({ ...formData, movingTime: e.target.value })}
                  placeholder="e.g., 15-20 min from Taipei Main Station"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Cost (TWD)</label>
                  <input
                    type="number"
                    value={formData.costTWD}
                    onChange={(e) => setFormData({ ...formData, costTWD: e.target.value })}
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Map & Image Search Query</label>
                  <input
                    type="text"
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder="English name for Google search"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {modalMode === "add" ? "Add Event" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Add New Day</h3>
              <button onClick={() => setIsDayModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddDaySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
                <input
                  required
                  type="text"
                  value={dayFormData.date}
                  onChange={(e) => setDayFormData({ ...dayFormData, date: e.target.value })}
                  placeholder="e.g., 20/06/2026"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Day of Week</label>
                <input
                  required
                  type="text"
                  value={dayFormData.dayOfWeek}
                  onChange={(e) => setDayFormData({ ...dayFormData, dayOfWeek: e.target.value })}
                  placeholder="e.g., Saturday"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                <input
                  required
                  type="text"
                  value={dayFormData.location}
                  onChange={(e) => setDayFormData({ ...dayFormData, location: e.target.value })}
                  placeholder="e.g., Taipei"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDayModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Add Day
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Please confirm</h3>
              <p className="text-sm text-slate-600 mt-2">{confirmDialog.message}</p>
            </div>

            <div className="p-5 flex gap-3">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmProceed}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
