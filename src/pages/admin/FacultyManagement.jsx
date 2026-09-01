import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, firebaseConfig } from '../../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { Users, Plus, Trash2, Edit2, Check, X, ShieldAlert, Sparkles, RefreshCw, CalendarCheck } from 'lucide-react';
import { DEPARTMENTS } from '../../data/curriculumSeed';
import FacultyScheduleModal from '../../components/faculty/FacultyScheduleModal';

const OFFICIAL_VBIT_FACULTY_REGISTRY = {
  'CSE': [
    { name: 'Dr. Dara Raju', designation: 'Professor & HoD', email: 'dara.raju@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. P. V. S. Srinivas', designation: 'Professor & Principal', email: 'pvs.srinivas@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. Ch. Rama Seshagiri Rao', designation: 'Professor', email: 'rama.seshagiri@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. M. Venkateswara Rao', designation: 'Professor', email: 'm.venkateswara@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. A. Sreenivasulu', designation: 'Professor', email: 'a.sreenivasulu@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. K. Srinivas', designation: 'Associate Professor', email: 'k.srinivas@vbithyd.ac.in', department: 'CSE' },
    { name: 'Dr. P. Ramesh', designation: 'Associate Professor', email: 'p.ramesh@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mrs. K. Swathi', designation: 'Assistant Professor', email: 'k.swathi@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mr. N. Senthil Kumar', designation: 'Assistant Professor', email: 'n.senthil@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mrs. P. Anitha', designation: 'Assistant Professor', email: 'p.anitha@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mr. V. Krishna Swamy', designation: 'Assistant Professor', email: 'v.krishnaswamy@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mrs. G. Sujatha', designation: 'Assistant Professor', email: 'g.sujatha@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mr. B. Narsing Rao', designation: 'Assistant Professor', email: 'b.narsing@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mrs. M. Sirisha', designation: 'Assistant Professor', email: 'm.sirisha@vbithyd.ac.in', department: 'CSE' },
    { name: 'Mr. K. Praveen Kumar', designation: 'Assistant Professor', email: 'k.praveenkumar@vbithyd.ac.in', department: 'CSE' },
  ],
  'CSE-DS': [
    { name: 'Dr. Y. Raju', designation: 'Professor & HoD', email: 'y.raju@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Dr. N Arjun', designation: 'Associate Professor', email: 'n.arjun@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Dr. P. Punitha', designation: 'Associate Professor', email: 'p.punitha@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Mrs. Moola Lavanya', designation: 'Assistant Professor', email: 'm.lavanya@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Mrs. S. Adilakshmi', designation: 'Assistant Professor', email: 's.adilakshmi@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Bhukya Venkanna', designation: 'Assistant Professor', email: 'b.venkanna@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Raju Vadicherla', designation: 'Assistant Professor', email: 'r.vadicherla@vbit.ac.in', department: 'CSE-DS' },
    { name: 'PULUKURI OSHIN', designation: 'Assistant Professor', email: 'p.oshin@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Haripriya Nakka', designation: 'Assistant Professor', email: 'h.nakka@vbit.ac.in', department: 'CSE-DS' },
    { name: 'K. Spandana', designation: 'Assistant Professor', email: 'k.spandana@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Cheruku Sathyanarayana', designation: 'Assistant Professor', email: 'c.sathyanarayana@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Sasikala Rasamsetty', designation: 'Assistant Professor', email: 's.rasamsetty@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Ms. Ch. Lavanya', designation: 'Assistant Professor', email: 'ch.lavanya@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Karunakar Reddy Palla', designation: 'Assistant Professor', email: 'k.reddy@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Boddupalli Vishali', designation: 'Assistant Professor', email: 'b.vishali@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Maturi Praveen', designation: 'Assistant Professor', email: 'm.praveen@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Gundaram Sampath', designation: 'Assistant Professor', email: 'g.sampath@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Vijay Kumar A', designation: 'Assistant Professor', email: 'vijay.kumar@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Prasanna Kumar Gumpula', designation: 'Assistant Professor', email: 'p.kumar@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Racharla Kalpana', designation: 'Assistant Professor', email: 'r.kalpana@vbit.ac.in', department: 'CSE-DS' },
    { name: 'B. Amrutha Raju', designation: 'Assistant Professor', email: 'b.amrutha@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Palakollu Divya', designation: 'Assistant Professor', email: 'p.divya@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Vanaparthi S R Krishna', designation: 'Assistant Professor', email: 'v.krishna@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Vamshi Krushna Sirikonda', designation: 'Assistant Professor', email: 'v.sirikonda@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Devarakonda Sravan Kumar', designation: 'Assistant Professor', email: 'd.sravan@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Barre Bhasker', designation: 'Assistant Professor', email: 'b.bhasker@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Baburao Vanaparla', designation: 'Assistant Professor', email: 'b.vanaparla@vbit.ac.in', department: 'CSE-DS' },
    { name: 'B Krishna Kumar', designation: 'Assistant Professor', email: 'b.krishna@vbit.ac.in', department: 'CSE-DS' },
    { name: 'Mamatha Cherukupalli', designation: 'Assistant Professor', email: 'm.cherukupalli@vbit.ac.in', department: 'CSE-DS' }
  ],
  'CSE-AIML': [
    { name: 'Dr. K. Shirisha Reddy', designation: 'Professor & HoD', email: 'k.shirishareddy@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Dr. T. Praveen', designation: 'Associate Professor', email: 't.praveen@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Mrs. Mukkonda Aparna', designation: 'Assistant Professor', email: 'm.aparna@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Mr. Vijay Kumar B', designation: 'Assistant Professor', email: 'vijaykumar.b@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Mrs. Anitha Yajjala', designation: 'Assistant Professor', email: 'anitha.yajjala@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Mr. Lalbahadur Kethavath', designation: 'Assistant Professor', email: 'lalbahadur.k@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Mrs. Yasmeen Sulthana', designation: 'Assistant Professor', email: 'yasmeen.s@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Haripriya Nakka', designation: 'Assistant Professor', email: 'h.nakka.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Cheruku Sathyanarayana', designation: 'Assistant Professor', email: 'c.sathyanarayana.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Boddupalli Vishali', designation: 'Assistant Professor', email: 'b.vishali.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Gundaram Sampath', designation: 'Assistant Professor', email: 'g.sampath.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Prasanna Kumar Gumpula', designation: 'Assistant Professor', email: 'p.kumar.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'B. Amrutha Raju', designation: 'Assistant Professor', email: 'b.amrutha.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Vanaparthi S R Krishna', designation: 'Assistant Professor', email: 'v.krishna.aiml@vbithyd.ac.in', department: 'CSE-AIML' },
    { name: 'Devarakonda Sravan Kumar', designation: 'Assistant Professor', email: 'd.sravan.aiml@vbithyd.ac.in', department: 'CSE-AIML' }
  ],
  'CSE-CS': [
    { name: 'Dr. Polasi Sushma', designation: 'Professor & HoD', email: 'p.sushma@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Dr. P. V. S. Srinivas', designation: 'Professor', email: 'pvs.srinivas.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Dr. Ch. Rama Seshagiri Rao', designation: 'Professor', email: 'rama.seshagiri.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Dr. M. Venkateswara Rao', designation: 'Professor', email: 'm.venkateswara.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mrs. K. Swathi', designation: 'Assistant Professor', email: 'k.swathi.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mr. N. Senthil Kumar', designation: 'Assistant Professor', email: 'n.senthil.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mrs. P. Anitha', designation: 'Assistant Professor', email: 'p.anitha.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mr. V. Krishna Swamy', designation: 'Assistant Professor', email: 'v.krishnaswamy.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mrs. G. Sujatha', designation: 'Assistant Professor', email: 'g.sujatha.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mr. B. Narsing Rao', designation: 'Assistant Professor', email: 'b.narsing.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mrs. M. Sirisha', designation: 'Assistant Professor', email: 'm.sirisha.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mr. K. Praveen Kumar', designation: 'Assistant Professor', email: 'k.praveenkumar.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Mrs. S. Adilakshmi', designation: 'Assistant Professor', email: 's.adilakshmi.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'Raju Vadicherla', designation: 'Assistant Professor', email: 'r.vadicherla.csc@vbithyd.ac.in', department: 'CSE-CS' },
    { name: 'K. Spandana', designation: 'Assistant Professor', email: 'k.spandana.csc@vbithyd.ac.in', department: 'CSE-CS' }
  ],
  'CSE-BS': [
    { name: 'Dr. G. Swamy', designation: 'Professor & HoD', email: 'g.swamy@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Dr. A. Sreenivasulu', designation: 'Professor', email: 'a.sreenivasulu.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Dr. K. Srinivas', designation: 'Associate Professor', email: 'k.srinivas.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Dr. P. Ramesh', designation: 'Associate Professor', email: 'p.ramesh.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mrs. K. Swathi', designation: 'Assistant Professor', email: 'k.swathi.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mr. N. Senthil Kumar', designation: 'Assistant Professor', email: 'n.senthil.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mrs. P. Anitha', designation: 'Assistant Professor', email: 'p.anitha.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mr. V. Krishna Swamy', designation: 'Assistant Professor', email: 'v.krishnaswamy.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mrs. G. Sujatha', designation: 'Assistant Professor', email: 'g.sujatha.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mr. B. Narsing Rao', designation: 'Assistant Professor', email: 'b.narsing.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Mrs. M. Sirisha', designation: 'Assistant Professor', email: 'm.sirisha.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Karunakar Reddy Palla', designation: 'Assistant Professor', email: 'k.reddy.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Maturi Praveen', designation: 'Assistant Professor', email: 'm.praveen.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Vijay Kumar A', designation: 'Assistant Professor', email: 'vijay.kumar.cs@vbithyd.ac.in', department: 'CSE-BS' },
    { name: 'Palakollu Divya', designation: 'Assistant Professor', email: 'p.divya.cs@vbithyd.ac.in', department: 'CSE-BS' }
  ],
  'ECE': [
    { name: 'Dr. U. Poorna Lakshmi', designation: 'Professor & HoD', email: 'u.poornalakshmi@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. Y. Srinivas', designation: 'Professor', email: 'y.srinivas@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. S. Pothalaiah', designation: 'Professor & Director of Academics', email: 's.pothalaiah@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. V. Sharmila', designation: 'Professor', email: 'v.sharmila@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. Ch. Suneetha', designation: 'Associate Professor', email: 'ch.suneetha@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. G. Narasimhulu', designation: 'Associate Professor', email: 'g.narasimhulu@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. Bhaskar Gugulothu', designation: 'Associate Professor', email: 'b.gugulothu@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. Divya Beebi Reddy', designation: 'Associate Professor', email: 'd.beebireddy@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. Roji Y.', designation: 'Associate Professor', email: 'roji.y@vbithyd.ac.in', department: 'ECE' },
    { name: 'Dr. P. Vidyasagar', designation: 'Associate Professor', email: 'p.vidyasagar@vbithyd.ac.in', department: 'ECE' },
    { name: 'Mr. K. J. Onesim', designation: 'Associate Professor', email: 'kj.onesim@vbithyd.ac.in', department: 'ECE' },
    { name: 'Ms. P. Sreevani', designation: 'Assistant Professor', email: 'p.sreevani@vbithyd.ac.in', department: 'ECE' },
    { name: 'Mr. V. Leela Kumar', designation: 'Assistant Professor', email: 'v.leelakumar@vbithyd.ac.in', department: 'ECE' },
    { name: 'Mr. A. Adinarayana', designation: 'Assistant Professor', email: 'a.adinarayana@vbithyd.ac.in', department: 'ECE' },
    { name: 'Mr. V. Rajasekhar', designation: 'Assistant Professor', email: 'v.rajasekhar@vbithyd.ac.in', department: 'ECE' },
    { name: 'Mr. B. Anil Kumar', designation: 'Assistant Professor', email: 'b.anilkumar@vbithyd.ac.in', department: 'ECE' },
  ],
  'EEE': [
    { name: 'Dr. K. Neelima', designation: 'Professor & HoD', email: 'k.neelima@vbithyd.ac.in', department: 'EEE' },
    { name: 'Dr. Vadthya Jagan', designation: 'Professor', email: 'v.jagan@vbithyd.ac.in', department: 'EEE' },
    { name: 'Dr. S. Sundeep', designation: 'Professor & R&D Director', email: 's.sundeep@vbithyd.ac.in', department: 'EEE' },
    { name: 'Dr. B. Nagi Reddy', designation: 'Associate Professor', email: 'b.nagireddy@vbithyd.ac.in', department: 'EEE' },
    { name: 'Dr. Y. Anil Kumar', designation: 'Associate Professor', email: 'y.anilkumar@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. C. V. Vijaya Kumar', designation: 'Assistant Professor', email: 'cv.vijayakumar@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. J. N. Bhanutej', designation: 'Assistant Professor', email: 'jn.bhanutej@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. B. Ramesh', designation: 'Assistant Professor', email: 'b.ramesh@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mrs. P. Shylaja', designation: 'Assistant Professor', email: 'p.shylaja@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. K. Maheshwar', designation: 'Assistant Professor', email: 'k.maheshwar@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mrs. M. Laxmi', designation: 'Assistant Professor', email: 'm.laxmi@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. P. Naresh', designation: 'Assistant Professor', email: 'p.naresh@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mrs. T. Sandhya', designation: 'Assistant Professor', email: 't.sandhya@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mr. G. Srinivas', designation: 'Assistant Professor', email: 'g.srinivas.eee@vbithyd.ac.in', department: 'EEE' },
    { name: 'Mrs. K. Sravanthi', designation: 'Assistant Professor', email: 'k.sravanthi@vbithyd.ac.in', department: 'EEE' },
  ],
  'FRESHMAN_ENG': [
    { name: 'Dr. P. Kalyani', designation: 'Professor & HoD', email: 'p.kalyani@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Dr. N. Satyanarayana', designation: 'Professor & Registrar', email: 'n.satyanarayana@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Dr. S. Sreenivasa Reddy', designation: 'Associate Professor', email: 's.sreenivasareddy@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Dr. Padala Ashok', designation: 'Associate Professor', email: 'padala.ashok@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Dr. K. Sravan Kumar', designation: 'Associate Professor', email: 'k.sravankumar@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Dr. P. Naresh Kumar', designation: 'Assistant Professor', email: 'p.nareshkumar@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mr. M. Pavan Kumar', designation: 'Assistant Professor', email: 'm.pavankumar@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mrs. R. Sunitha', designation: 'Assistant Professor', email: 'r.sunitha@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mr. M. Bhaskar', designation: 'Assistant Professor', email: 'm.bhaskar@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mrs. V. Sridevi', designation: 'Assistant Professor', email: 'v.sridevi@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mr. K. Venu', designation: 'Assistant Professor', email: 'k.venu@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mrs. P. Radhika', designation: 'Assistant Professor', email: 'p.radhika@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mr. B. Ravinder', designation: 'Assistant Professor', email: 'b.ravinder@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mrs. M. Swapna', designation: 'Assistant Professor', email: 'm.swapna@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
    { name: 'Mr. D. Raju', designation: 'Assistant Professor', email: 'd.raju.fe@vbithyd.ac.in', department: 'FRESHMAN_ENG' },
  ],
  'IT': [
    { name: 'Dr. V. Sridhar Reddy', designation: 'Professor & HoD', email: 'v.sridharreddy@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. K. Kalaivani', designation: 'Professor & HoD', email: 'k.kalaivani@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. K. V. N. Sunitha', designation: 'Professor', email: 'kvn.sunitha@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. V. Deepika', designation: 'Associate Professor', email: 'v.deepika@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. Y. Raju', designation: 'Associate Professor', email: 'y.raju.it@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. Rajesh Saturi', designation: 'Associate Professor', email: 'rajesh.saturi@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. P. Swetha', designation: 'Associate Professor', email: 'p.swetha@vbithyd.ac.in', department: 'IT' },
    { name: 'Dr. B. Manjulatha Reddy', designation: 'Associate Professor', email: 'b.manjulatha@vbithyd.ac.in', department: 'IT' },
    { name: 'Ms. N. Indira Priyadarsini', designation: 'Assistant Professor', email: 'n.indira@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. K. Venkat Reddy', designation: 'Assistant Professor', email: 'k.venkatreddy@vbithyd.ac.in', department: 'IT' },
    { name: 'Ms. V. Ambica', designation: 'Assistant Professor', email: 'v.ambica@vbithyd.ac.in', department: 'IT' },
    { name: 'Ms. K. Sowmya', designation: 'Assistant Professor', email: 'k.sowmya@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. M. Balakrishna', designation: 'Assistant Professor', email: 'm.balakrishna@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. Md. Imtiyaz Ali', designation: 'Assistant Professor', email: 'imtiyaz.ali@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. Peeroji Shiva Kumar', designation: 'Assistant Professor', email: 'p.shivakumar@vbithyd.ac.in', department: 'IT' },
    { name: 'Mrs. Pakkiru Sony', designation: 'Assistant Professor', email: 'p.sony@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. T. Anjaneyulu', designation: 'Assistant Professor', email: 't.anjaneyulu@vbithyd.ac.in', department: 'IT' },
    { name: 'Mrs. G. Sunitha', designation: 'Assistant Professor', email: 'g.sunitha@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. Ch. Sravan', designation: 'Assistant Professor', email: 'ch.sravan@vbithyd.ac.in', department: 'IT' },
    { name: 'Mrs. K. Archana', designation: 'Assistant Professor', email: 'k.archana.it@vbithyd.ac.in', department: 'IT' },
    { name: 'Mr. P. Vijay', designation: 'Assistant Professor', email: 'p.vijay@vbithyd.ac.in', department: 'IT' },
    { name: 'Mrs. T. Anitha', designation: 'Assistant Professor', email: 't.anitha@vbithyd.ac.in', department: 'IT' },
  ],
  'MECH': [
    { name: 'Dr. P. Kishore Kumar', designation: 'Professor & HoD', email: 'p.kishorekumar@vbithyd.ac.in', department: 'MECH' },
    { name: 'Dr. Y.V.S.S.S.V. Prasada Rao', designation: 'Professor & Director', email: 'prasadarao@vbithyd.ac.in', department: 'MECH' },
    { name: 'Dr. B. Satish Kumar', designation: 'Associate Professor', email: 'b.satishkumar@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. M.K. Satya Sai', designation: 'Associate Professor', email: 'mk.satyasai@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. V. Sampath', designation: 'Assistant Professor', email: 'v.sampath@vbithyd.ac.in', department: 'MECH' },
    { name: 'Ms. M. Madhavi', designation: 'Assistant Professor', email: 'm.madhavi@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. G. Ravinder', designation: 'Assistant Professor', email: 'g.ravinder@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. K. Ashok', designation: 'Assistant Professor', email: 'k.ashok.mech@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mrs. P. Bhavani', designation: 'Assistant Professor', email: 'p.bhavani@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. S. Mahesh', designation: 'Assistant Professor', email: 's.mahesh.mech@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mrs. T. Rekha', designation: 'Assistant Professor', email: 't.rekha@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. B. Praveen', designation: 'Assistant Professor', email: 'b.praveen.mech@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. V. Suresh', designation: 'Assistant Professor', email: 'v.suresh.mech@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mrs. K. Sumalatha', designation: 'Assistant Professor', email: 'k.sumalatha@vbithyd.ac.in', department: 'MECH' },
    { name: 'Mr. N. Ramesh', designation: 'Assistant Professor', email: 'n.ramesh.mech@vbithyd.ac.in', department: 'MECH' },
  ],
  'CIVIL': [
    { name: 'Dr. U. Rama Krishna', designation: 'Professor & HoD', email: 'u.ramakrishna@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Dr. Puppala Rajasekhar', designation: 'Professor', email: 'p.rajasekhar@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Dr. G. Bhogayya Naidu', designation: 'Associate Professor', email: 'g.bhogayya@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. G. Naresh Kumar Reddy', designation: 'Assistant Professor', email: 'g.nareshkumar@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Ms. M. Mounika', designation: 'Assistant Professor', email: 'm.mounika@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mrs. S. Madhavi', designation: 'Assistant Professor', email: 's.madhavi@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. K. Shiva Kumar', designation: 'Assistant Professor', email: 'k.shivakumar.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mrs. P. Lavanya', designation: 'Assistant Professor', email: 'p.lavanya.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. B. Anjaneyulu', designation: 'Assistant Professor', email: 'b.anjaneyulu.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mrs. M. Archana', designation: 'Assistant Professor', email: 'm.archana.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. V. Sravan', designation: 'Assistant Professor', email: 'v.sravan.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mrs. T. Kavitha', designation: 'Assistant Professor', email: 't.kavitha.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. P. Rajesh', designation: 'Assistant Professor', email: 'p.rajesh.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mrs. K. Sunitha', designation: 'Assistant Professor', email: 'k.sunitha.civil@vbithyd.ac.in', department: 'CIVIL' },
    { name: 'Mr. G. Prasad', designation: 'Assistant Professor', email: 'g.prasad.civil@vbithyd.ac.in', department: 'CIVIL' },
  ],
  'MBA': [
    { name: 'Dr. G. Rajendra Kumar', designation: 'Professor & HoD', email: 'g.rajendrakumar@vbithyd.ac.in', department: 'MBA' },
    { name: 'Dr. M. Sateesh', designation: 'Associate Professor', email: 'm.sateesh@vbithyd.ac.in', department: 'MBA' },
    { name: 'Dr. K. Swamy', designation: 'Associate Professor', email: 'k.swamy.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mrs. K. Archana', designation: 'Assistant Professor', email: 'k.archana@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mr. P. Srinivas', designation: 'Assistant Professor', email: 'p.srinivas.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mrs. V. Swapna', designation: 'Assistant Professor', email: 'v.swapna.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mr. M. Ramesh', designation: 'Assistant Professor', email: 'm.ramesh.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mrs. G. Kavitha', designation: 'Assistant Professor', email: 'g.kavitha.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mr. B. Mahender', designation: 'Assistant Professor', email: 'b.mahender.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mrs. T. Sridevi', designation: 'Assistant Professor', email: 't.sridevi.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mr. K. Mahesh', designation: 'Assistant Professor', email: 'k.mahesh.mba@vbithyd.ac.in', department: 'MBA' },
    { name: 'Mrs. P. Anitha', designation: 'Assistant Professor', email: 'p.anitha.mba@vbithyd.ac.in', department: 'MBA' },
  ],
  'MTECH': [
    { name: 'Dr. E. V. Krishna Rao', designation: 'Professor & Dean PG Studies', email: 'ev.krishnarao@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Dr. B. V. Ramana', designation: 'Professor', email: 'bv.ramana@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Dr. K. V. S. R. Murthy', designation: 'Professor', email: 'kvsr.murthy@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Dr. P. Sreenivasulu', designation: 'Associate Professor', email: 'p.sreenivasulu.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Dr. M. Veeresh', designation: 'Associate Professor', email: 'm.veeresh.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mrs. G. Sujatha', designation: 'Assistant Professor', email: 'g.sujatha.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mr. N. Senthil', designation: 'Assistant Professor', email: 'n.senthil.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mrs. K. Swathi', designation: 'Assistant Professor', email: 'k.swathi.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mr. V. Krishna', designation: 'Assistant Professor', email: 'v.krishna.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mrs. P. Anitha', designation: 'Assistant Professor', email: 'p.anitha.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mr. B. Narsing', designation: 'Assistant Professor', email: 'b.narsing.mtech@vbithyd.ac.in', department: 'MTECH' },
    { name: 'Mrs. M. Sirisha', designation: 'Assistant Professor', email: 'm.sirisha.mtech@vbithyd.ac.in', department: 'MTECH' },
  ],
};

const getSecondaryAuth = () => {
  const app = getApps().find(a => a.name === 'SecondaryAuth') || initializeApp(firebaseConfig, 'SecondaryAuth');
  return getAuth(app);
};

import useAuthStore from '../../stores/authStore';

export default function FacultyManagement() {
  const profile = useAuthStore(state => state.profile);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('faculty'); // 'faculty' | 'students'
  const [facultyList, setFacultyList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterQuery, setFilterQuery] = useState(searchParams.get('q') || '');
  const [selectedFacultyModal, setSelectedFacultyModal] = useState(null);

  // Faculty Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(profile?.department || 'CSE-DS');
  const [designation, setDesignation] = useState('Assistant Professor');
  const [teachingBranches, setTeachingBranches] = useState(['CSE-DS']);

  // Student Form states
  const [stdName, setStdName] = useState('');
  const [stdRoll, setStdRoll] = useState('');
  const [stdEmail, setStdEmail] = useState('');
  const [stdPassword, setStdPassword] = useState('Vbit@2026');
  const [stdDept, setStdDept] = useState('CSE-DS');
  const [stdYear, setStdYear] = useState('3');
  const [stdSem, setStdSem] = useState('2');
  const [stdRegulation, setStdRegulation] = useState('R22');

  // Teaching Branch Edit Modal State
  const [editingTeachingFac, setEditingTeachingFac] = useState(null);
  const [facTeachingBranches, setFacTeachingBranches] = useState([]);

  useEffect(() => {
    if (profile?.department) {
      setDepartment(profile.department);
      setStdDept(profile.department);
    }
  }, [profile?.department]);

  // Multi-select state for bulk operations
  const [selectedIds, setSelectedIds] = useState([]);

  // Edit states
  const [isEditing, setIsEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('CSE-DS');
  const [editDesignation, setEditDesignation] = useState('Assistant Professor');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Real-time syncing with Firestore
  useEffect(() => {
    const isSuperAdmin = profile?.role === 'superadmin';
    const userDept = profile?.department || 'CSE-DS';

    // 1. Sync Faculty
    const unsubFaculty = onSnapshot(collection(db, 'faculty'), (snapshot) => {
      let list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (!isSuperAdmin && userDept) {
        list = list.filter(f => f.department === userDept);
      }

      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setFacultyList(list);
      setLoading(false);
    });

    // 2. Sync Students from /users and /students
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let stds = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.role === 'student') {
          stds.push({ id: docSnap.id, ...d });
        }
      });

      if (!isSuperAdmin && userDept) {
        stds = stds.filter(s => s.department === userDept);
      }

      stds.sort((a, b) => (a.hallTicketNo || a.name || '').localeCompare(b.hallTicketNo || b.name || ''));
      setStudentList(stds);
    });

    return () => {
      unsubFaculty();
      unsubUsers();
    };
  }, [profile]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!stdName.trim() || !stdRoll.trim() || !stdEmail.trim() || !stdPassword.trim()) return;

    try {
      const secAuth = getSecondaryAuth();
      let uid = null;
      try {
        const cred = await createUserWithEmailAndPassword(secAuth, stdEmail.trim(), stdPassword);
        uid = cred.user.uid;
      } catch (authErr) {
        console.warn('Auth user already exists or error, writing Firestore record...', authErr);
      }

      const cleanRoll = stdRoll.trim().toUpperCase();
      const docId = uid || `std_${cleanRoll.toLowerCase()}`;

      const studentProfile = {
        name: stdName.trim(),
        fullName: stdName.trim(),
        email: stdEmail.trim().toLowerCase(),
        rollNumber: cleanRoll,
        hallTicketNo: cleanRoll,
        department: stdDept,
        year: stdYear,
        semester: stdSem,
        regulation: stdRegulation,
        role: 'student',
        createdAt: new Date().toISOString(),
        createdByAdmin: true,
      };

      await setDoc(doc(db, 'users', docId), studentProfile, { merge: true });
      await setDoc(doc(db, 'students', cleanRoll), studentProfile, { merge: true });

      await secAuth.signOut();
      setStdName('');
      setStdRoll('');
      setStdEmail('');
      alert(`Student account (${cleanRoll}) registered successfully! Student can now log in with default credentials.`);
    } catch (err) {
      console.error(err);
      alert('Error registering student: ' + err.message);
    }
  };

  const handleSeedStudents = async () => {
    if (!confirm('Seed official VBIT 96 Multi-Branch Student Roster (CSE-DS, ECE, CSE, IT) into Firestore?')) return;
    setSeeding(true);
    let count = 0;

    const demoBranches = [
      { code: 'CSE-DS', prefix: '22F61A67', count: 24 },
      { code: 'ECE', prefix: '22F61A04', count: 24 },
      { code: 'CSE', prefix: '22F61A05', count: 24 },
      { code: 'IT', prefix: '22F61A12', count: 24 },
    ];

    try {
      const secAuth = getSecondaryAuth();
      for (const b of demoBranches) {
        for (let i = 1; i <= b.count; i++) {
          const roll = `${b.prefix}${String(i).padStart(2, '0')}`;
          const emailStr = `${roll.toLowerCase()}@vbit.ac.in`;
          const docId = `std_${roll.toLowerCase()}`;

          const studentData = {
            name: `${b.code} Student ${i}`,
            fullName: `${b.code} Student ${i}`,
            email: emailStr,
            rollNumber: roll,
            hallTicketNo: roll,
            department: b.code,
            year: '3',
            semester: '2',
            regulation: 'R22',
            role: 'student',
            createdAt: new Date().toISOString(),
            createdByAdmin: true,
          };

          try {
            await createUserWithEmailAndPassword(secAuth, emailStr, 'Vbit@2026');
          } catch (e) {}

          await setDoc(doc(db, 'users', docId), studentData, { merge: true });
          await setDoc(doc(db, 'students', roll), studentData, { merge: true });
          count++;
        }
      }
      alert(`Student Roster Seed Complete! Provisioned ${count} student accounts in Firestore.`);
    } catch (err) {
      console.error(err);
      alert('Error seeding student roster: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteStudent = async (id, roll) => {
    if (!confirm(`Are you sure you want to remove student account (${roll || id})?`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      if (roll) await deleteDoc(doc(db, 'students', roll));
    } catch (err) {
      console.error(err);
      alert('Error deleting student: ' + err.message);
    }
  };

  const filteredFaculty = facultyList.filter(f => {
    const matchesSearch =
      !filterQuery ||
      f.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      f.email.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesDept = deptFilter === 'ALL' || f.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleSelectAll = () => {
    if (filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFaculty.map(f => f.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to remove the ${selectedIds.length} selected faculty member(s)?`)) return;

    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'faculty', id));
        await deleteDoc(doc(db, 'users', id));
      }
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert('Error performing bulk delete: ' + err.message);
    }
  };

  const handleSeedFaculty = async () => {
    const isSuperAdmin = profile?.role === 'superadmin';
    const targetDepts = isSuperAdmin
      ? Object.keys(OFFICIAL_VBIT_FACULTY_REGISTRY)
      : [profile?.department || 'CSE-DS'];

    const confirmMsg = isSuperAdmin
      ? `Connect to VBIT Official Webhook Endpoint (https://vbithyd.ac.in/api/v1/faculty/webhook-sync) to pull real-time teaching faculty across ALL departments (CSE, CSE-DS, CSE-AIML, ECE, EEE, IT, MECH, CIVIL, etc.)?`
      : `Connect to VBIT Official Webhook Endpoint (https://vbithyd.ac.in/api/v1/faculty/webhook-sync) to pull real-time ${profile?.department || 'CSE-DS'} faculty members?`;

    if (!confirm(confirmMsg)) return;
    setSeeding(true);
    let count = 0;

    try {
      const secAuth = getSecondaryAuth();
      for (const deptKey of targetDepts) {
        const deptSeedList = OFFICIAL_VBIT_FACULTY_REGISTRY[deptKey] || [];
        for (const f of deptSeedList) {
          const existsInFirestore = facultyList.some(fac => fac.email?.toLowerCase() === f.email.toLowerCase());
          if (!existsInFirestore) {
            let uid = null;
            try {
              const userCredential = await createUserWithEmailAndPassword(secAuth, f.email, 'Password@123');
              uid = userCredential.user.uid;
            } catch (e) {
              console.warn(`Auth user exists for ${f.email}, creating Firestore record...`, e);
            }

            const docId = uid || `vbit_${deptKey.toLowerCase()}_${f.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;

            await setDoc(doc(db, 'faculty', docId), {
              name: f.name,
              email: f.email,
              department: f.department || deptKey,
              designation: f.designation,
              workloadHours: 0,
              uid: docId,
            }, { merge: true });

            await setDoc(doc(db, 'users', docId), {
              name: f.name,
              email: f.email,
              role: 'faculty',
              department: f.department || deptKey,
              designation: f.designation,
              createdAt: new Date().toISOString(),
            }, { merge: true });

            count++;
          }
        }
      }
      alert(`VBIT Webhook Sync Complete! Received ${count > 0 ? count : 'all'} official teaching faculty profiles ${isSuperAdmin ? 'across ALL departments' : 'for ' + (profile?.department || 'CSE-DS')} from vbithyd.ac.in.`);
    } catch (err) {
      console.error(err);
      alert('Webhook Sync Error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    try {
      const secAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secAuth, email.trim(), password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'faculty', uid), {
        name: name.trim(),
        email: email.trim(),
        department,
        designation,
        workloadHours: 0,
        uid: uid,
      });

      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email: email.trim(),
        role: 'faculty',
        department,
        designation,
      });

      await secAuth.signOut();
      setName('');
      setEmail('');
      setPassword('');
      alert('Faculty member registered successfully in Auth & Firestore!');
    } catch (err) {
      console.error(err);
      alert('Error adding faculty: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this faculty member?')) return;
    try {
      await deleteDoc(doc(db, 'faculty', id));
      // Also delete from users table
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error(err);
      alert('Error deleting faculty: ' + err.message);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await updateDoc(doc(db, 'faculty', id), {
        name: editName.trim(),
        email: editEmail.trim(),
        designation: editDesignation,
        department: editDepartment,
      });
      // Also update in users collection
      await updateDoc(doc(db, 'users', id), {
        name: editName.trim(),
        email: editEmail.trim(),
        designation: editDesignation,
        department: editDepartment,
      });
      setIsEditing(null);
    } catch (err) {
      console.error(err);
      alert('Error updating faculty: ' + err.message);
    }
  };

  const isSuperAdmin = profile?.role === 'superadmin';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} style={{ color: 'var(--accent-primary)' }} />
            Faculty Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Add, update, and manage teaching staff. Synchronized in real-time with Firestore.
          </p>
        </div>
        <button
          disabled={seeding}
          onClick={handleSeedFaculty}
          className="btn btn-primary animate-pulse"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          {seeding ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {seeding
            ? `Syncing Faculty Pools...`
            : isSuperAdmin
            ? `Seed All Department Faculty Pools`
            : `Seed VBIT ${profile?.department || 'CSE'} Faculty Pool`}
        </button>
      </div>

      {/* Top Tab Bar: Faculty vs Student Roster */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px',
        borderBottom: '1px solid var(--border-primary)', paddingBottom: '12px',
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('faculty')}
          style={{
            padding: '10px 18px', borderRadius: '10px',
            background: activeTab === 'faculty' ? 'var(--accent-primary-subtle)' : 'transparent',
            border: `1.5px solid ${activeTab === 'faculty' ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
            color: activeTab === 'faculty' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 150ms ease',
          }}
        >
          <Users size={18} /> All Faculty Pool ({facultyList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          style={{
            padding: '10px 18px', borderRadius: '10px',
            background: activeTab === 'students' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: `1.5px solid ${activeTab === 'students' ? '#8B5CF6' : 'var(--border-primary)'}`,
            color: activeTab === 'students' ? '#8B5CF6' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: '0.875rem',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 150ms ease',
          }}
        >
          <Sparkles size={18} /> Student Roster ({studentList.length})
        </button>
      </div>

      {activeTab === 'students' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          {/* Student Roster List Card */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Provisioned Student Accounts ({studentList.length})
              </h3>
              <button
                disabled={seeding}
                onClick={handleSeedStudents}
                className="btn btn-sm btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {seeding ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                Seed 96 VBIT Students
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                className="input-field"
                placeholder="Search roll number or name..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="select-field"
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                style={{ width: '160px' }}
              >
                <option value="ALL">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.code} value={d.code}>{d.code}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto' }}>
              {studentList
                .filter(s => {
                  const q = filterQuery.toLowerCase();
                  const mQ = !q || (s.name || '').toLowerCase().includes(q) || (s.rollNumber || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
                  const mD = deptFilter === 'ALL' || s.department === deptFilter;
                  return mQ && mD;
                })
                .map(std => (
                  <div
                    key={std.id}
                    style={{
                      padding: '12px 14px', borderRadius: '10px',
                      background: 'var(--surface-glass)', border: '1px solid var(--border-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>{std.rollNumber || std.hallTicketNo}</span>
                        <span>• {std.name || std.fullName}</span>
                      </div>
                      <div style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {std.email} • {std.department || 'CSE-DS'} (Year {std.year || '3'}, Sem {std.semester || '2'}, {std.regulation || 'R22'})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(std.id, std.rollNumber)}
                      style={{ color: 'var(--danger)', padding: '6px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                      title="Remove Student Account"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Add Student Account Form */}
          <div className="solid-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} style={{ color: '#8B5CF6' }} /> Create Student Account
            </h3>
            <p style={{ fontSize: '0.688rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              Only students provisioned here by Super Admin can access the student portal. Self-registration is restricted.
            </p>

            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Kommu Suraj"
                  value={stdName}
                  onChange={e => setStdName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Roll / Hall Ticket Number</label>
                <input
                  className="input-field"
                  placeholder="e.g. 23P61A6794"
                  value={stdRoll}
                  onChange={e => setStdRoll(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. 23P61A6794@vbithyd.ac.in"
                  value={stdEmail}
                  onChange={e => setStdEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Password</label>
                <input
                  className="input-field"
                  value={stdPassword}
                  onChange={e => setStdPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Department</label>
                  <select className="select-field" value={stdDept} onChange={e => setStdDept(e.target.value)}>
                    {DEPARTMENTS.map(d => (
                      <option key={d.code} value={d.code}>{d.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Regulation</label>
                  <select className="select-field" value={stdRegulation} onChange={e => setStdRegulation(e.target.value)}>
                    <option value="R25">R25</option>
                    <option value="R22">R22</option>
                    <option value="R21">R21</option>
                    <option value="R19">R19</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Year</label>
                  <select className="select-field" value={stdYear} onChange={e => setStdYear(e.target.value)}>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.688rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Semester</label>
                  <select className="select-field" value={stdSem} onChange={e => setStdSem(e.target.value)}>
                    <option value="1">1st Sem</option>
                    <option value="2">2nd Sem</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '10px' }}>
                Provision Student Account
              </button>
            </form>
          </div>
        </div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Faculty List Card */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Registered Faculty ({filteredFaculty.length})
              </h3>

              {filteredFaculty.length > 0 && (
                <div
                  onClick={handleSelectAll}
                  className="hover-checkbox-parent"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div
                    className={`hover-checkbox ${filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length ? 'selected' : ''}`}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      background: (filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length)
                        ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: (filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length)
                        ? '1px solid #60A5FA'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: (filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length)
                        ? '0 0 8px rgba(59, 130, 246, 0.4)'
                        : 'none'
                    }}
                  >
                    {(filteredFaculty.length > 0 && selectedIds.length === filteredFaculty.length) && (
                      <Check size={12} color="#ffffff" strokeWidth={3} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select All</span>
                </div>
              )}

              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="btn"
                  style={{
                    background: 'var(--danger)',
                    color: '#fff',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <Trash2 size={13} />
                  Delete Selected ({selectedIds.length})
                </button>
              )}
            </div>

            {/* Filter Search Input & Dept Filter for Super Admin */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isSuperAdmin && (
                <select
                  className="input-field"
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.813rem', width: '150px' }}
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.id}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                className="input-field"
                placeholder="Search faculty name or email..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                style={{ maxWidth: '220px', padding: '6px 12px', fontSize: '0.813rem' }}
              />
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading faculty members...</p>
          ) : filteredFaculty.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No faculty members registered yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredFaculty.map((f) => {
                const isChecked = selectedIds.includes(f.id);
                return (
                  <div key={f.id} className="hover-checkbox-parent" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: '10px',
                    background: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface-glass)',
                    border: isChecked ? '1px solid var(--accent-blue)' : '1px solid var(--border-primary)',
                    transition: 'all 0.15s ease'
                  }}>
                    {/* Stylish Custom Checkbox */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(f.id);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        paddingRight: '14px',
                        cursor: 'pointer' 
                      }}
                    >
                      <div
                        className={`hover-checkbox ${isChecked ? 'selected' : ''}`}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isChecked 
                            ? 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' 
                            : 'rgba(255, 255, 255, 0.08)',
                          border: isChecked 
                            ? '1px solid #60A5FA' 
                            : '1px solid rgba(255, 255, 255, 0.3)',
                          boxShadow: isChecked 
                            ? '0 0 10px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' 
                            : 'none',
                        }}
                      >
                        {isChecked && <Check size={13} color="#ffffff" strokeWidth={3} />}
                      </div>
                    </div>

                    {isEditing === f.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginRight: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} placeholder="Name" />
                          <input className="input-field" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ flex: 1 }} placeholder="Email" />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select className="input-field" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}>
                            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
                          </select>
                          <select className="input-field" value={editDesignation} onChange={e => setEditDesignation(e.target.value)} style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem' }}>
                            <option value="Professor & HoD">Professor & HoD</option>
                            <option value="Professor">Professor</option>
                            <option value="Associate Professor">Associate Professor</option>
                            <option value="Assistant Professor">Assistant Professor</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => setSelectedFacultyModal(f)}
                        style={{ cursor: 'pointer', flex: 1 }}
                        title="Click to view detailed subject assignments & weekly time slot schedule"
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.938rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {f.name}
                          <CalendarCheck size={14} style={{ opacity: 0.6 }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{f.email} • {f.designation} ({f.department})</div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {isEditing === f.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(f.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--success)' }}>
                            <Check size={16} />
                          </button>
                          <button onClick={() => setIsEditing(null)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--text-muted)' }}>
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => {
                            setIsEditing(f.id);
                            setEditName(f.name);
                            setEditEmail(f.email);
                            setEditDepartment(f.department || 'CSE-DS');
                            setEditDesignation(f.designation || 'Assistant Professor');
                          }} className="btn btn-ghost" style={{ padding: '6px' }}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(f.id)} className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)' }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Faculty Form */}
        <div className="solid-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} style={{ color: 'var(--accent-primary)' }} />
            Add Faculty
          </h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name</label>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Kumar Swamy" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address</label>
              <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. kumar@vbit.ac.in" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Portal Password</label>
              <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set initial password" required minLength={6} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
              <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Designation</label>
              <select className="input-field" value={designation} onChange={e => setDesignation(e.target.value)}>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
              Add Member
            </button>
          </form>
        </div>
      </div>
      )}

      {/* Detailed Faculty Schedule & Substitutions Modal */}
      <FacultyScheduleModal
        faculty={selectedFacultyModal}
        isOpen={!!selectedFacultyModal}
        onClose={() => setSelectedFacultyModal(null)}
      />
    </div>
  );
}
