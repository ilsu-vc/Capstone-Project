import { supabase } from './supabase';

export const db = {};
export const storage = supabase.storage;

export function collection(db: any, path: string) {
  return { path };
}

export function query(col: any, ...ops: any[]) {
  return { ...col, ops };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, dir };
}

export function limit(n: number) {
  return { type: 'limit', n };
}

export function doc(db: any, path: string, ...rest: string[]) {
  // path might be 'orders', id might be in rest[0]
  // or path might be 'users/user123'
  if (rest.length > 0) {
    return { path, id: rest[0] };
  }
  const parts = path.split('/');
  return { path: parts[0], id: parts[1] };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

export async function getDocs(q: any) {
  let builder = supabase.from(q.path).select('*');
  if (q.ops) {
    for (const op of q.ops) {
      if (op.type === 'where') {
        if (op.op === '==') builder = builder.eq(op.field, op.value);
        if (op.op === '!=') builder = builder.neq(op.field, op.value);
        if (op.op === 'array-contains') builder = builder.contains(op.field, [op.value]);
      }
      if (op.type === 'orderBy') {
        builder = builder.order(op.field, { ascending: op.dir === 'asc' });
      }
      if (op.type === 'limit') {
        builder = builder.limit(op.n);
      }
    }
  }
  const { data, error } = await builder;
  if (error) throw error;
  return {
    docs: (data || []).map(d => ({
      id: d.id || d.uid,
      data: () => d
    })),
    empty: !data || data.length === 0
  };
}

export function onSnapshot(q: any, callback: (snap: any) => void, errorCb?: (e: any) => void) {
  let isUnmounted = false;

  const fetchAndNotify = async () => {
    try {
      const snap = await getDocs(q);
      if (!isUnmounted) callback(snap);
    } catch (e) {
      if (!isUnmounted && errorCb) errorCb(e);
    }
  };

  fetchAndNotify();

  const channel = supabase.channel(`public:${q.path}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: q.path }, () => {
      fetchAndNotify();
    })
    .subscribe();

  return () => {
    isUnmounted = true;
    supabase.removeChannel(channel);
  };
}

export async function addDoc(col: any, data: any) {
  const { data: res, error } = await supabase.from(col.path).insert([data]).select().single();
  if (error) throw error;
  return { id: res?.id || 'new-id' };
}

export async function updateDoc(docRef: any, data: any) {
  const { error } = await supabase.from(docRef.path).update(data).eq('id', docRef.id);
  if (error) {
    const { error: err2 } = await supabase.from(docRef.path).update(data).eq('uid', docRef.id);
    if (err2) throw err2;
  }
}

export async function deleteDoc(docRef: any) {
  const { error } = await supabase.from(docRef.path).delete().eq('id', docRef.id);
  if (error) {
    const { error: err2 } = await supabase.from(docRef.path).delete().eq('uid', docRef.id);
    if (err2) throw err2;
  }
}

export async function getDoc(docRef: any) {
  const { data, error } = await supabase.from(docRef.path).select('*').eq('uid', docRef.id).single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
  return {
    exists: () => !!data,
    data: () => data
  };
}

export async function setDoc(docRef: any, data: any) {
  const { error } = await supabase.from(docRef.path).upsert([data]);
  if (error) throw error;
}

export function ref(storage: any, path: string) { 
  return { path }; 
}

export async function uploadBytes(ref: any, file: File) {
  const { data, error } = await supabase.storage.from('activepro_assets').upload(ref.path, file, { upsert: true });
  if (error) throw error;
  return { ref };
}

export async function getDownloadURL(ref: any) {
  const { data } = supabase.storage.from('activepro_assets').getPublicUrl(ref.path);
  return data.publicUrl;
}

export function writeBatch(db: any) {
  const operations: any[] = [];
  return {
    set: (ref: any, data: any) => operations.push({ type: 'set', ref, data }),
    update: (ref: any, data: any) => operations.push({ type: 'update', ref, data }),
    delete: (ref: any) => operations.push({ type: 'delete', ref }),
    commit: async () => {
      // Execute sequentially as a fallback for batch
      for (const op of operations) {
        if (op.type === 'set') await setDoc(op.ref, op.data);
        if (op.type === 'update') await updateDoc(op.ref, op.data);
        if (op.type === 'delete') await deleteDoc(op.ref);
      }
    }
  };
}

export function arrayUnion(...elements: any[]) {
  // In Supabase, appending to a JSONB array or Postgres array needs a different approach.
  // For the sake of the adapter, we will return a special object that could be handled if needed,
  // but usually it's just passed as data.
  return elements;
}
