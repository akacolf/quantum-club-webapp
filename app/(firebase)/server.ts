import "server-only";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getApps, ServiceAccount } from "firebase-admin/app";
import admin from 'firebase-admin'
import { Auth, getAuth } from "firebase-admin/auth";
import { env } from "@/env";

// Fallback dummy key for build-time static page collection when env vars are unset
const DUMMY_BUILD_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCq/HTjsiQlLKAO\n+6k32Hv8jY+yrB0KbKbLNkNDv8+D2sPNyZ6g3TgJ5BeHLexvwoU8KGHWlDI1/3dz\n4IEUn2kWAbZ6bKK54HTK/Mlui6CVVZMkJOU+/SUb/Rxva74QLRej85iu+4XgLICQ\nPGAAN3CADc/116bD79aepYTXT5s1GmtcIwgsCks/G5RYJ2yWItvSfYacLCfTyV4t\nKn1i9K7qfPb3Q6sqTEcYDQQI5O8n5yKQq1Z/SIR5QSLlt/M1qAVLv94UToSiHKA/\n6vLi67fdtI9myBCZRmbt3cdCbYBZTQojCt+RNb8l1AW3lTNiuizqIns+G1shqQXv\nPrj77WJ3AgMBAAECggEABGqquSXS2cQdnSoJST4Bc5jlpsQlFi3Y3/ifteSVEahG\n+WBp4NZxc0SHCnxKn3vXrur6+bX5sqCEs/XYVpYIsbpCK4/1rBpWKfuQe+CFuagR\nFTkSL3Dp9w0d2FiqH+KO3qBwfqSdwGGBVBPkTu9o0DzUPhG7HeZGFc3blXDHi5Bt\nKtKDYPeBHYMjHUuVl0GapejLw2E3fbd0b1zVbMdsq5db6jpwfu5F36fMt1rYtt/Y\nhi3cGt4PWlBo52tj2r08cYqVaK/314a9aEgFOzXsB3NsbXbc86OvNaEzEoL4mokq\nDAYHksiNM1B4y5kkh5s3rQXjUyVtyJwa2e/inOpagQKBgQDesyC2aGlS4dvtSdNa\nIlP740kO67f9pSXvjTUdfb7COYsF8k9NdJ/4KDt9JN0tOKJRhF0q2zK9jd6iiXD+\nNnG1aB0oRAI4Bo7mheXVq5Gy13XcQiCbWXbr1gkVWiuOeaab3LNhekSHkDtBE7hs\nXTI2qv0hCb9Vzc3aEOnNvNqAoQKBgQDEjcAuwkkTQgiOO60d55glcPPWJ+bgaq6v\nqDEj2nQNgRxb2HwDHSqnIfHKE1JHWyhkHr1iiH6FJTs3EH3EPXsiZ5A0IX3HAJzW\nFrLV9HdMlUyASMCryV74wXEgeUvM1WbqRXdPeej3kn4Brj3M6gDgZBE1aKfAUg7t\nmekT/7dUFwKBgCmCyj42CCvi3dPFRxgt/emd3Chj18/30LJuZ9AveDdL8pYRLKcL\nbiYbmbsh+/hJ7jezrIoogbTDlRRG+kDodRmTZpvy0VcQIeLmYokJigcEEnwT92/9\npSUgqGDKhgPwuRWkdetdlxiN0f23Z1ELrihyhux5nKipzA0xyeMHqNMBAoGAEHru\nLT1/EQ1NWFeqmUJM4H7LAx7PXeuz/+hzTlVHu8YikZTiOQSeCetvsYjTMkZzaYmm\nSXe2XAWWJHTOhsC87VKPpb9VI3VqsQywK/5WbmZqRqtS9FRrESJvEND6yQ7vlR8D\n9Pb80J1I0W1Bo0fPkQDy7G58+kQnGkb4YwPi5DsCgYBAx8ICjuxOkZD6MBTkw/l9\nx8+MFmL4t6VykdFJVIpiozWreXEcEev7GFerNggnRSuUvvvMk7hTReZ2Lf+vi35H\nVnSALeTd24b1JR6ODaKrzHJSkiwNkPrspwU/iN4BwI3aYFgp1xStbeGLCDcjyAiC\nNkREWdbgt0imMEF+McKcdw==\n-----END PRIVATE KEY-----`;

const privateKey = env.FIREBASE_PRIVATE_KEY
  ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : DUMMY_BUILD_KEY;

const clientEmail = env.FIREBASE_CLIENT_EMAIL || "build@dummy.iam.gserviceaccount.com";
const projectId = env.FIREBASE_PROJECT_ID || "dummy-project";

const certUrl = `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`;

const serviceAccount = {
  type: "service_account",
  project_id: projectId,
  private_key_id: env.FIREBASE_PRIVATE_KEY_ID || "dummy-key-id",
  private_key: privateKey,
  client_email: clientEmail,
  client_id: env.FIREBASE_CLIENT_ID || "dummy-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: certUrl,
  universe_domain: "googleapis.com"
};

// Initialize function to ensure proper setup

let firestore: Firestore;
let auth: Auth;
const currentApps = getApps();

if (!currentApps.length) {
    const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount)
    });
    firestore = getFirestore(app); 
    auth = getAuth(app);
} else {
   const app = currentApps[0];
   firestore = getFirestore(app);
   auth = getAuth(app);
}

export { firestore, auth };
