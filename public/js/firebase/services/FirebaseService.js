import { db } from '../config.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    addDoc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';

export class FirebaseService {
    constructor(collectionName) {
        this.db = db;
        this.collectionName = collectionName;
        this.collection = collection(db, collectionName);
    }

    async getAll(filters = [], sortBy = null) {
        try {
            let q = this.collection;
            
            if (filters.length > 0) {
                filters.forEach(filter => {
                    q = query(q, where(filter.field, filter.operator, filter.value));
                });
            }

            if (sortBy) {
                q = query(q, orderBy(sortBy.field, sortBy.direction || 'asc'));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error en getAll ${this.collectionName}:`, error);
            throw error;
        }
    }

    subscribeToChanges(callback, filters = []) {
        let q = this.collection;
        
        if (filters.length > 0) {
            filters.forEach(filter => {
                q = query(q, where(filter.field, filter.operator, filter.value));
            });
        }

        return onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(docs);
        });
    }

    async create(data) {
        try {
            const docRef = await addDoc(this.collection, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error en create ${this.collectionName}:`, error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            const docRef = doc(this.collection, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error(`Error en update ${this.collectionName}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const docRef = doc(this.collection, id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Error en delete ${this.collectionName}:`, error);
            throw error;
        }
    }
} 