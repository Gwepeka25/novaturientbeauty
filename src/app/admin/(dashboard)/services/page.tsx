import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { formatFeeCents } from "@/lib/services-data";
import { upsertService } from "./actions";

export default async function AdminServicesPage() {
  await requireAdminSession();
  const services = await prisma.service.findMany({ orderBy: { displayOrder: "asc" } });

  return (
    <>
      <h1 className="admin-page-title">Services &amp; fees</h1>
      <p className="admin-page-subtitle">Shown on the public site exactly as entered here.</p>

      {services.map((service) => (
        <div className="admin-card" key={service.id}>
          <h2>{service.name}</h2>
          <form action={upsertService}>
            <input type="hidden" name="id" value={service.id} />
            <div className="admin-row">
              <div className="admin-field">
                <label>Name</label>
                <input type="text" name="name" defaultValue={service.name} required />
              </div>
              <div className="admin-field">
                <label>Duration (min)</label>
                <input type="number" name="durationMin" min={5} defaultValue={service.durationMin} required />
              </div>
              <div className="admin-field">
                <label>Price (€)</label>
                <input
                  type="number"
                  name="priceEuros"
                  min={0}
                  step="0.01"
                  defaultValue={(service.priceCents / 100).toFixed(2)}
                  required
                />
              </div>
              <div className="admin-field">
                <label>Format</label>
                <select name="format" defaultValue={service.format}>
                  <option value="both">In person &amp; online</option>
                  <option value="in_person">In person only</option>
                  <option value="online">Online only</option>
                </select>
              </div>
              <div className="admin-field">
                <label>Display order</label>
                <input type="number" name="displayOrder" defaultValue={service.displayOrder} />
              </div>
            </div>
            <div className="admin-field">
              <label>Description</label>
              <textarea name="description" defaultValue={service.description} required />
            </div>
            <label className="admin-row" style={{ gap: 6 }}>
              <input type="checkbox" name="active" defaultChecked={service.active} />
              Active (visible on the site)
            </label>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">
                Save {service.name}
              </button>
              <span style={{ color: "var(--muted)", fontSize: 13, alignSelf: "center" }}>
                Currently: {formatFeeCents(service.priceCents, service.currency)}
              </span>
            </div>
          </form>
        </div>
      ))}

      <div className="admin-card">
        <h2>Add a new service</h2>
        <form action={upsertService}>
          <div className="admin-row">
            <div className="admin-field">
              <label>Name</label>
              <input type="text" name="name" required />
            </div>
            <div className="admin-field">
              <label>Duration (min)</label>
              <input type="number" name="durationMin" min={5} defaultValue={60} required />
            </div>
            <div className="admin-field">
              <label>Price (€)</label>
              <input type="number" name="priceEuros" min={0} step="0.01" defaultValue={0} required />
            </div>
            <div className="admin-field">
              <label>Format</label>
              <select name="format" defaultValue="both">
                <option value="both">In person &amp; online</option>
                <option value="in_person">In person only</option>
                <option value="online">Online only</option>
              </select>
            </div>
            <div className="admin-field">
              <label>Display order</label>
              <input type="number" name="displayOrder" defaultValue={services.length} />
            </div>
          </div>
          <div className="admin-field">
            <label>Description</label>
            <textarea name="description" required />
          </div>
          <label className="admin-row" style={{ gap: 6 }}>
            <input type="checkbox" name="active" defaultChecked />
            Active (visible on the site)
          </label>
          <div className="admin-form-actions">
            <button className="admin-btn" type="submit">
              Add service
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
