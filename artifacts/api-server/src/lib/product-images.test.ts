import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PRODUCT_IMAGES, normalizeProductImageList } from "./product-images.js";

const imageUrls = (count: number) => Array.from(
  { length: count },
  (_, index) => `https://cdn.example.com/rental-products/store-7/image-${index + 1}.webp`,
);

test("accepts an optional list with up to eight product images", () => {
  assert.deepEqual(JSON.parse(normalizeProductImageList([])), []);
  assert.equal(JSON.parse(normalizeProductImageList(imageUrls(MAX_PRODUCT_IMAGES))).length, MAX_PRODUCT_IMAGES);
});

test("rejects a ninth product image", () => {
  assert.throws(
    () => normalizeProductImageList(imageUrls(MAX_PRODUCT_IMAGES + 1)),
    /8 صور كحد أقصى/,
  );
});

test("rejects malformed or unsafe image URLs", () => {
  assert.throws(() => normalizeProductImageList("not-json"), /قائمة JSON صحيحة/);
  assert.throws(() => normalizeProductImageList(["ftp://cdn.example.com/image.webp"]), /HTTP أو HTTPS/);
  assert.throws(() => normalizeProductImageList(["not-a-url"]), /HTTP أو HTTPS/);
});

test("deduplicates image URLs before persistence", () => {
  const result = JSON.parse(normalizeProductImageList([imageUrls(1)[0], ` ${imageUrls(1)[0]} `]));
  assert.deepEqual(result, [imageUrls(1)[0]]);
});
