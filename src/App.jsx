import React, { useEffect, useMemo, useState } from "react";
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
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle2
} from "lucide-react";

const FALLBACK_STORAGE_KEY = "taiwan-trip-data";

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

export default function App() {
  const [exchangeRate, setExchangeRate] = useState(22.5);
  const [itineraryData, setItineraryData] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [activeDayIdx, setActiveDayIdx] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    time: "",
    title: "",
    desc: "",
    costTWD: 0,
    type: "map",
    query: ""
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
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

  const handleSaveData = async () => {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(itineraryData));

    try {
      const response = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itineraryData)
      });

      if (!response.ok) {
        throw new Error("Cannot save to API");
      }

      showToast("Saved to JSON file successfully!");
    } catch {
      showToast("Saved local backup only (server unavailable).");
    }
  };

  const openAddModal = (dayIdx) => {
    setActiveDayIdx(dayIdx);
    setModalMode("add");
    setFormData({
      id: `ev-${Date.now()}`,
      time: "",
      title: "",
      desc: "",
      costTWD: 0,
      type: "camera",
      query: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (dayIdx, event) => {
    setActiveDayIdx(dayIdx);
    setModalMode("edit");
    setFormData({ ...event });
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (dayIdx, eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      const newData = [...itineraryData];
      newData[dayIdx].events = newData[dayIdx].events.filter((ev) => ev.id !== eventId);
      setItineraryData(newData);
      showToast("Event deleted!");
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const newData = [...itineraryData];

    if (modalMode === "add") {
      newData[activeDayIdx].events.push(formData);
    } else {
      const eventIdx = newData[activeDayIdx].events.findIndex((ev) => ev.id === formData.id);
      if (eventIdx !== -1) {
        newData[activeDayIdx].events[eventIdx] = formData;
      }
    }

    setItineraryData(newData);
    setIsModalOpen(false);
  };

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
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-medium text-sm">{toastMessage}</span>
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
                onClick={handleSaveData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Save className="w-5 h-5" />
                Save Itinerary
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 md:mt-8">
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
            <div key={`${day.date}-${dIdx}`} className="relative group">
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
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ml-2 md:ml-6 relative">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 z-0 hidden md:block"></div>
                <div className="divide-y divide-slate-100">
                  {day.events.map((event) => (
                    <div key={event.id} className="p-4 md:p-6 relative z-10 flex flex-col md:flex-row gap-4 md:gap-6 hover:bg-slate-50 transition-colors group/event">
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

                      <div className="flex items-center md:items-start md:flex-col md:w-32 flex-shrink-0 gap-3 md:gap-2">
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
                        {event.desc && <p className="text-slate-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{event.desc}</p>}

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

                  <div className="p-4 md:px-6 bg-slate-50/50">
                    <button
                      onClick={() => openAddModal(dIdx)}
                      className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" /> Add event to {day.dayOfWeek}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

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
                  placeholder="Detailed info, tickets, notes..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none"
                ></textarea>
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
    </div>
  );
}
