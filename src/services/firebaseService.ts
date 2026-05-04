import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy, where, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase';
import { PodcastSegment } from './geminiService';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: 'user' | 'admin' | 'listener';
  createdAt: string;
}

export const syncUserProfile = async (user: any): Promise<UserProfile> => {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const newUser: UserProfile = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: user.email === 'damstert1@gmail.com' ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newUser);
      return newUser;
    } else {
      return userSnap.data() as UserProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
};

export interface LibraryEntry {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  pdfUrl?: string;
  imageUrl?: string;
  script: PodcastSegment[];
  chapters: any[];
  showNotes: string;
  language: string;
  duration: number;
  date: string;
  ownerId: string;
  isPublic?: boolean;
}

export const savePodcastToFirebase = async (
  title: string,
  description: string,
  audioBlob: Blob,
  pdfBlob: Blob | null,
  imageBlob: Blob | null,
  script: PodcastSegment[],
  chapters: any[],
  showNotes: string,
  language: string,
  duration: number
): Promise<LibraryEntry> => {
  if (!auth.currentUser) {
    throw new Error("User must be logged in to save podcasts.");
  }

  const ownerId = auth.currentUser.uid;
  const timestamp = Date.now();
  
  // Upload Audio
  const audioRef = ref(storage, `podcasts/${ownerId}/${timestamp}_audio.wav`);
  await uploadBytes(audioRef, audioBlob);
  const audioUrl = await getDownloadURL(audioRef);

  // Upload PDF (if exists)
  let pdfUrl = undefined;
  if (pdfBlob) {
    const pdfRef = ref(storage, `podcasts/${ownerId}/${timestamp}_source`);
    await uploadBytes(pdfRef, pdfBlob);
    pdfUrl = await getDownloadURL(pdfRef);
  }

  // Upload Image (if exists)
  let imageUrl = undefined;
  if (imageBlob) {
    const imageRef = ref(storage, `podcasts/${ownerId}/${timestamp}_image`);
    await uploadBytes(imageRef, imageBlob);
    imageUrl = await getDownloadURL(imageRef);
  }

  const dateStr = new Date().toISOString();

  const newEntryData = {
    title,
    description,
    audioUrl,
    pdfUrl: pdfUrl || null,
    imageUrl: imageUrl || null,
    script: JSON.stringify(script),
    chapters: JSON.stringify(chapters),
    showNotes,
    language,
    duration,
    date: dateStr,
    ownerId
  };

  const docRef = await addDoc(collection(db, 'podcasts'), newEntryData);

  return {
    ...newEntryData,
    id: docRef.id,
    script,
    chapters,
    pdfUrl,
    imageUrl
  };
};

export const getPodcastsFromFirebase = async (): Promise<LibraryEntry[]> => {
  if (!auth.currentUser) {
    return [];
  }

  const ownerId = auth.currentUser.uid;
  const q = query(
    collection(db, 'podcasts'),
    where('ownerId', '==', ownerId),
    orderBy('date', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const podcasts: LibraryEntry[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    podcasts.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      audioUrl: data.audioUrl,
      pdfUrl: data.pdfUrl,
      imageUrl: data.imageUrl,
      script: typeof data.script === 'string' ? JSON.parse(data.script) : data.script,
      chapters: typeof data.chapters === 'string' ? JSON.parse(data.chapters) : data.chapters,
      showNotes: data.showNotes,
      language: data.language,
      duration: data.duration,
      date: data.date,
      ownerId: data.ownerId
    });
  });

  return podcasts;
};

export const getPublicPodcastsFromFirebase = async (): Promise<LibraryEntry[]> => {
  const q = query(
    collection(db, 'podcasts'),
    where('isPublic', '==', true),
    orderBy('date', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const podcasts: LibraryEntry[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    podcasts.push({
      id: doc.id,
      title: data.title,
      description: data.description,
      audioUrl: data.audioUrl,
      pdfUrl: data.pdfUrl,
      imageUrl: data.imageUrl,
      script: typeof data.script === 'string' ? JSON.parse(data.script) : data.script,
      chapters: typeof data.chapters === 'string' ? JSON.parse(data.chapters) : data.chapters,
      showNotes: data.showNotes,
      language: data.language,
      duration: data.duration,
      date: data.date,
      ownerId: data.ownerId,
      isPublic: data.isPublic
    });
  });

  return podcasts;
};

export const deletePodcastFromFirebase = async (id: string, audioUrl: string, pdfUrl?: string, imageUrl?: string) => {
  if (!auth.currentUser) return;

  // Delete document
  await deleteDoc(doc(db, 'podcasts', id));

  // Delete files from storage
  try {
    if (audioUrl) {
      const audioRef = ref(storage, audioUrl);
      await deleteObject(audioRef);
    }
    if (pdfUrl) {
      const pdfRef = ref(storage, pdfUrl);
      await deleteObject(pdfRef);
    }
    if (imageUrl) {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    }
  } catch (error) {
    console.error("Error deleting files from storage:", error);
    // Continue even if storage deletion fails (e.g., file already deleted)
  }
};

export const updatePodcastInFirebase = async (id: string, title: string, description: string, showNotes?: string) => {
  if (!auth.currentUser) return;
  
  const podcastRef = doc(db, 'podcasts', id);
  const updateData: any = {
    title,
    description
  };
  if (showNotes !== undefined) {
    updateData.showNotes = showNotes;
  }
  await updateDoc(podcastRef, updateData);
};

export const updatePodcastVisibilityInFirebase = async (id: string, isPublic: boolean) => {
  if (!auth.currentUser) return;
  
  const podcastRef = doc(db, 'podcasts', id);
  await updateDoc(podcastRef, {
    isPublic
  });
};
