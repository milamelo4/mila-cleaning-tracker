const assert = require("node:assert/strict");
const {test} = require("node:test");
const {randomUUID} = require("node:crypto");
const {createRequire} = require("node:module");
const path = require("node:path");

const projectId = "demo-mila-cleaning-tracker";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;
process.env.GOOGLE_CLOUD_PROJECT = projectId;

const {initializeApp, deleteApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const clientRequire = createRequire(path.resolve(__dirname, "../../client/package.json"));
const webApp = clientRequire("firebase/app");
const webDb = clientRequire("firebase/firestore");

const denied = (action) => assert.rejects(action, {code: "permission-denied"});

test("payment rules protect generated invoices while retaining admin edits", async () => {
  const servicesResponse = await fetch("http://127.0.0.1:4400/emulators");
  assert.ok(servicesResponse.ok);
  const services = await servicesResponse.json();
  assert.equal(services.firestore?.port, 8080);

  const id = "rules-" + randomUUID();
  const adminId = id + "-admin";
  const helperId = id + "-helper";
  const businessPath = "businesses/mila-cleaning-tracker";
  const app = initializeApp({projectId}, id);
  const db = getFirestore(app);
  const business = db.doc(businessPath);
  const adminMember = business.collection("members").doc(adminId);
  const helperMember = business.collection("members").doc(helperId);
  const client = business.collection("clients").doc(id);
  const paymentId = "biweekly_" + id + "_2026-11-16";
  const paymentPath = businessPath + "/payments/" + paymentId;
  const payment = db.doc(paymentPath);
  const other = business.collection("payments").doc("biweekly_" + id + "_2026-11-30");
  const reserved = business.collection("payments").doc("biweekly_" + id + "_invalid");
  const cleaningClient = business.collection("clients").doc(id + "-per");
  const cleaning = business.collection("cleanings").doc(id + "-cleaning");
  const cleaningPayment = business.collection("payments").doc(id + "-per-payment");
  const original = {
    cleaningId: "", cleaningDate: "", clientId: id,
    clientName: "Rules test client", billingType: "Biweekly",
    periodStart: "2026-11-03", periodEnd: "2026-11-16",
    includedCleaningIds: [id + "-visit"], amountCharged: 500,
    actualHours: 12, helperPayout: 0, paid: false, paidDate: "", notes: "",
  };
  const ordinary = {
    cleaningId: cleaning.id, cleaningDate: "2026-11-12",
    clientId: cleaningClient.id, clientName: "Ordinary rules client",
    amountCharged: 125, actualHours: 3, helperPayout: 0,
    paid: false, paidDate: "", notes: "",
  };
  const makeClient = (uid) => {
    const localApp = webApp.initializeApp({projectId, apiKey: "demo-key"}, uid);
    const localDb = webDb.getFirestore(localApp);
    webDb.connectFirestoreEmulator(localDb, "127.0.0.1", 8080, {
      mockUserToken: {sub: uid, user_id: uid},
    });
    return {localApp, localDb};
  };
  const admin = makeClient(adminId);
  const helper = makeClient(helperId);
  const reference = (local, doc) => webDb.doc(local.localDb, doc.path);
  try {
    const setup = db.batch();
    setup.set(adminMember, {role: "admin"});
    setup.set(helperMember, {role: "helper"});
    setup.set(client, {name: original.clientName, billingType: "Biweekly"});
    setup.set(payment, original);
    setup.set(cleaningClient, {name: ordinary.clientName, billingType: "Per Cleaning"});
    setup.set(cleaning, {
      clientId: cleaningClient.id, date: ordinary.cleaningDate, status: "Completed",
    });
    await setup.commit();

    const adminPayment = reference(admin, payment);
    assert.equal((await webDb.getDoc(adminPayment)).data().amountCharged, 500);
    await denied(() => webDb.getDoc(reference(helper, payment)));
    await denied(() => webDb.setDoc(reference(admin, other), {
      ...original, periodStart: "2026-11-17", periodEnd: "2026-11-30",
    }));
    await denied(() => webDb.setDoc(reference(admin, reserved), ordinary));
    await denied(() => webDb.deleteDoc(adminPayment));
    await denied(() => webDb.updateDoc(adminPayment, {
      periodEnd: "2026-11-17",
    }));
    await denied(() => webDb.updateDoc(adminPayment, {
      includedCleaningIds: [id + "-different"],
    }));
    await denied(() => webDb.updateDoc(reference(helper, payment), {
      paid: true, paidDate: "2026-11-24",
    }));
    await webDb.updateDoc(adminPayment, {
      paid: true, paidDate: "2026-11-24", amountCharged: 495,
      notes: "Check received",
    });
    assert.equal((await payment.get()).data().paid, true);
    assert.equal((await payment.get()).data().amountCharged, 495);
    console.log("PASS: Admin can mark paid and edit totals; invoice identity is protected");

    await webDb.setDoc(reference(admin, cleaningPayment), ordinary);
    await webDb.updateDoc(reference(admin, cleaningPayment), {
      paid: true, paidDate: "2026-11-24",
    });
    await webDb.deleteDoc(reference(admin, cleaningPayment));
    console.log("PASS: Ordinary per-cleaning payment flow is unchanged");
  } finally {
    await Promise.allSettled([admin, helper].map(async ({localApp, localDb}) => {
      await webDb.terminate(localDb);
      await webApp.deleteApp(localApp);
    }));
    const cleanup = db.batch();
    for (const ref of [adminMember, helperMember, client, payment, other,
      reserved, cleaningClient, cleaning, cleaningPayment]) cleanup.delete(ref);
    try {
      await cleanup.commit();
    } finally {
      await db.terminate();
      await deleteApp(app);
    }
  }
});
