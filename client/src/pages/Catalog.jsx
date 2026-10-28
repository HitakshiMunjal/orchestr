import { useEffect, useState } from "react";
import {
  Building2,
  Cpu,
  Plus,
  Search,
  Users,
  Edit2,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api, { errMsg } from "../api/client";
import { PageHeader, Modal, Spinner, EmptyState, LoadingGrid } from "../components/ui";

export default function Catalog() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === "admin";

  const [resources, setResources] = useState([]);
  const [incharges, setIncharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "venue",
    building: "Main Block",
    capacity: 100,
    inchargeId: "",
    isActive: true,
  });

  async function loadData() {
    try {
      setLoading(true);
      const [resRes, inchargesRes] = await Promise.all([
        api.get("/resources"),
        isAdmin ? api.get("/users?role=incharge") : Promise.resolve({ data: { users: [] } }),
      ]);
      setResources(resRes.data.resources || []);
      setIncharges(inchargesRes.data.users || []);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenAdd() {
    setEditingResource(null);
    setForm({
      name: "",
      type: "venue",
      building: "Main Block",
      capacity: 50,
      inchargeId: incharges[0]?._id || "",
      isActive: true,
    });
    setModalOpen(true);
  }

  function handleOpenEdit(r) {
    setEditingResource(r);
    setForm({
      name: r.name,
      type: r.type,
      building: r.building,
      capacity: r.capacity,
      inchargeId: r.inchargeId?._id || r.inchargeId,
      isActive: r.isActive,
    });
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingResource) {
        await api.patch(`/resources/${editingResource._id}`, form);
        toast.success(`Resource "${form.name}" updated`);
      } else {
        await api.post("/resources", form);
        toast.success(`Resource "${form.name}" added to catalog`);
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  const filtered = resources.filter((r) => {
    const matchesType = filterType === "all" || r.type === filterType;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Campus Infrastructure"
        title="Resource & Venue Catalog"
        subtitle="Manage official campus venues and shared event gear. Bookings enforce physical seat caps and sequential In-Charge locks."
        actions={
          isAdmin && (
            <button id="add-resource-btn" onClick={handleOpenAdd} className="btn btn-primary">
              <Plus className="h-4 w-4" /> Add Resource
            </button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="glass p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`btn btn-sm ${
              filterType === "all" ? "btn-primary" : "btn-ghost"
            }`}
          >
            All Resources ({resources.length})
          </button>
          <button
            onClick={() => setFilterType("venue")}
            className={`btn btn-sm ${
              filterType === "venue" ? "btn-primary" : "btn-ghost"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Venues (
            {resources.filter((r) => r.type === "venue").length})
          </button>
          <button
            onClick={() => setFilterType("equipment")}
            className={`btn btn-sm ${
              filterType === "equipment" ? "btn-primary" : "btn-ghost"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" /> Equipment (
            {resources.filter((r) => r.type === "equipment").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search venue, lab, or gear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No resources found"
          message="Try adjusting your filter or search query."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const isVenue = r.type === "venue";
            return (
              <div
                key={r._id}
                className="glass glass-hover p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`p-2.5 rounded-xl ${
                        isVenue
                          ? "bg-teal-400/15 text-teal-300 ring-1 ring-teal-400/30"
                          : "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/30"
                      }`}
                    >
                      {isVenue ? <Building2 className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          r.isActive
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {r.isActive ? "Active" : "Inactive"}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                          title="Edit Resource"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-white text-lg">{r.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{r.building}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">
                      {isVenue ? "Physical Capacity" : "Available Units"}
                    </span>
                    <span className="font-bold text-white text-sm">
                      {r.capacity} {isVenue ? "Seats" : "Units"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-amber-300" /> Assigned In-Charge
                    </span>
                    <span className="font-medium text-slate-200">
                      {r.inchargeId?.name || "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Resource Modal (Admin Only) */}
      {isAdmin && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingResource ? `Edit "${editingResource.name}"` : "Add New Resource"}
          footer={
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="resource-form"
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? <Spinner /> : null}
                {editingResource ? "Save Changes" : "Create Resource"}
              </button>
            </>
          }
        >
          <form id="resource-form" onSubmit={handleSave} className="space-y-4 text-sm">
            <div>
              <label className="label">Resource Name</label>
              <input
                className="input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Explore Stars Auditorium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Resource Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  disabled={Boolean(editingResource)}
                >
                  <option value="venue">Venue (Room)</option>
                  <option value="equipment">Equipment (Gear)</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {form.type === "venue" ? "Seat Capacity" : "Unit Count"}
                </label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  required
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className="label">Building / Facility Location</label>
              <input
                className="input"
                required
                value={form.building}
                onChange={(e) => setForm({ ...form, building: e.target.value })}
                placeholder="e.g. Tech Block A"
              />
            </div>

            <div>
              <label className="label">Assigned Venue In-Charge</label>
              <select
                className="input"
                required
                value={form.inchargeId}
                onChange={(e) => setForm({ ...form, inchargeId: e.target.value })}
              >
                <option value="">Select In-Charge Faculty...</option>
                {incharges.map((inc) => (
                  <option key={inc._id} value={inc._id}>
                    {inc.name} ({inc.email}) · {inc.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is-active-toggle"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-white/20 bg-ink-900 text-teal-400 focus:ring-teal-400/20"
              />
              <label htmlFor="is-active-toggle" className="text-xs text-slate-300">
                Resource is active and available for club bookings
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
