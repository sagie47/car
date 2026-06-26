'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Listing } from '../lib/types';
import { recordListingActivity, updateListingDraft } from '../lib/api';

export function ListingReview({ listing }: { listing: Listing }) {
  const router = useRouter();
  const post = listing.draft.marketplacePost;
  const [title, setTitle] = useState(post?.title ?? listing.draft.title);
  const [price, setPrice] = useState(post?.price?.toString() ?? '');
  const [description, setDescription] = useState(post?.description ?? listing.draft.longDescription);
  const [photoUrls, setPhotoUrls] = useState(post?.photoUrls ?? []);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!post) return null;

  async function save() {
    setPending(true);
    try {
      await updateListingDraft(listing.id, {
        title,
        price: price.trim() ? Number(price) : null,
        description,
        photoUrls
      });
      setMessage('Marketplace draft saved.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the draft.');
    } finally {
      setPending(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      await recordListingActivity(listing.id, 'copied', { block: label });
      setMessage(`${label} copied.`);
    } catch {
      setMessage('Clipboard access was blocked. Copy the text manually.');
    }
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photoUrls.length) return;
    const next = [...photoUrls];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotoUrls(next);
  }

  return (
    <div className="stack">
      <div className="field-grid">
        <label className="field">
          <span>Marketplace title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>Marketplace price</span>
          <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Marketplace description</span>
        <textarea rows={10} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="inline-stack">
        <button className="button button-primary" type="button" onClick={save} disabled={pending}>
          {pending ? 'Saving...' : 'Save listing edits'}
        </button>
        <button className="button" type="button" onClick={() => copy('title', title)}>Copy title</button>
        <button className="button" type="button" onClick={() => copy('price', price)}>Copy price</button>
        <button className="button" type="button" onClick={() => copy('description', description)}>Copy description</button>
        <button
          className="button"
          type="button"
          onClick={() => copy('full post', `${title}\n${price}\n\n${description}`)}
        >
          Copy full post
        </button>
        <button className="button" type="button" onClick={() => copy('listing ID', listing.id)}>Copy listing ID</button>
      </div>
      <div className="stack">
        <p><strong>Posting photos</strong></p>
        {photoUrls.map((url, index) => (
          <div className="photo-row" key={url}>
            <span className="mono-copy">{index + 1}. {url}</span>
            <button className="button button-compact" type="button" onClick={() => movePhoto(index, -1)}>Up</button>
            <button className="button button-compact" type="button" onClick={() => movePhoto(index, 1)}>Down</button>
            <button className="button button-compact" type="button" onClick={() => setPhotoUrls(photoUrls.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
          </div>
        ))}
      </div>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
