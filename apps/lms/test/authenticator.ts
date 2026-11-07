import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

/**
 * Minimal software WebAuthn authenticator for tests (ES256, "none"
 * attestation, user verification). Lets the tests drive real registration
 * and sign-in through SimpleWebAuthn's verification, with no mocks.
 */
export class SoftAuthenticator {
  private readonly keys = generateKeyPairSync("ec", { namedCurve: "P-256" });
  readonly credentialId = randomBytes(16).toString("base64url");
  private counter = 0;
  private userHandle?: string;

  constructor(
    private readonly rpId: string,
    private readonly origin: string,
  ) {}

  private rpIdHash(): Buffer {
    return createHash("sha256").update(this.rpId).digest();
  }

  private cosePublicKey(): Uint8Array {
    const jwk = this.keys.publicKey.export({ format: "jwk" }) as {
      x: string;
      y: string;
    };
    return isoCBOR.encode(
      new Map<number, number | Uint8Array>([
        [1, 2], // kty: EC2
        [3, -7], // alg: ES256
        [-1, 1], // crv: P-256
        [-2, new Uint8Array(Buffer.from(jwk.x, "base64url"))],
        [-3, new Uint8Array(Buffer.from(jwk.y, "base64url"))],
      ]),
    );
  }

  register(
    options: PublicKeyCredentialCreationOptionsJSON,
  ): RegistrationResponseJSON {
    this.userHandle = options.user.id;
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.create",
        challenge: options.challenge,
        origin: this.origin,
        crossOrigin: false,
      }),
    );
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.counter);
    const credId = Buffer.from(this.credentialId, "base64url");
    const credIdLen = Buffer.alloc(2);
    credIdLen.writeUInt16BE(credId.length);
    const authData = Buffer.concat([
      this.rpIdHash(),
      Buffer.from([0x01 | 0x04 | 0x40]), // UP | UV | AT
      counter,
      Buffer.alloc(16), // AAGUID
      credIdLen,
      credId,
      Buffer.from(this.cosePublicKey()),
    ]);
    const attestationObject = isoCBOR.encode(
      new Map<string, string | Uint8Array | Map<string, string>>([
        ["fmt", "none"],
        ["attStmt", new Map<string, string>()],
        ["authData", new Uint8Array(authData)],
      ]),
    );
    return {
      id: this.credentialId,
      rawId: this.credentialId,
      type: "public-key",
      response: {
        clientDataJSON: clientDataJSON.toString("base64url"),
        attestationObject: Buffer.from(attestationObject).toString("base64url"),
        transports: ["internal"],
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }

  authenticate(
    options: PublicKeyCredentialRequestOptionsJSON,
    opts: { counter?: number; origin?: string } = {},
  ): AuthenticationResponseJSON {
    this.counter = opts.counter ?? this.counter + 1;
    const clientDataJSON = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        challenge: options.challenge,
        origin: opts.origin ?? this.origin,
        crossOrigin: false,
      }),
    );
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(this.counter);
    const authenticatorData = Buffer.concat([
      this.rpIdHash(),
      Buffer.from([0x01 | 0x04]),
      counter,
    ]);
    const signature = sign(
      "sha256",
      Buffer.concat([
        authenticatorData,
        createHash("sha256").update(clientDataJSON).digest(),
      ]),
      this.keys.privateKey,
    );
    return {
      id: this.credentialId,
      rawId: this.credentialId,
      type: "public-key",
      response: {
        clientDataJSON: clientDataJSON.toString("base64url"),
        authenticatorData: authenticatorData.toString("base64url"),
        signature: signature.toString("base64url"),
        userHandle: this.userHandle,
      },
      clientExtensionResults: {},
      authenticatorAttachment: "platform",
    };
  }
}
