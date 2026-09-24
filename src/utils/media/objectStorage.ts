import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer, type FileTypeResult } from "file-type";

export function createClient(options?: S3ClientConfig): S3Client {
    return new S3Client({
        region: options?.region || import.meta.env.OBJECT_STORAGE_REGION,
        endpoint: options?.endpoint || import.meta.env.OBJECT_STORAGE_ENDPOINT,
        credentials: {
            accessKeyId:
                // @ts-expect-error key does not exist on AwsCredentialIdentity event though it fucking does
                options?.credentials?.accessKeyId || import.meta.env.OBJECT_STORAGE_ACCESS_KEY,
            secretAccessKey:
                // @ts-expect-error key does not exist on AwsCredentialIdentity event though it fucking does
                options?.credentials?.secretAccessKey || import.meta.env.OBJECT_STORAGE_SECRET_KEY,
        },
        forcePathStyle: options?.forcePathStyle || true,
        ...options,
    });
}

export interface StorableObjectData {
    buffer: Uint8Array<ArrayBuffer>;
    type: FileTypeResult;
    hash: string;
}

export async function getFileStorableData(
    buffer: StorableObjectData["buffer"],
): Promise<StorableObjectData> {
    const type = await fileTypeFromBuffer(buffer);
    if (!type) {
        throw new Error("Unknown or invalid file in given buffer");
    }

    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hash = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return { buffer, type, hash };
}

export interface StorageKey {
    prefix: string;
    owner: string;
    file: string;
}

export function generateStorageKey(
    prefix: string,
    owner: string | number,
    data?: StorableObjectData,
): string {
    const file = data ? `${data.hash}.${data.type.ext}` : crypto.randomUUID();
    return `${prefix}/${owner}/${file}`;
}

export function parseStorageKey(key: string): StorageKey {
    const pieces = key.split("/").filter(Boolean);
    if (pieces.length < 3) {
        throw new Error("Supplied key has too few pieces to be a storage key");
    }

    const file = pieces.pop() as string;
    const owner = pieces.pop() as string;
    const prefix = pieces.join("/");

    return { prefix, owner, file };
}
