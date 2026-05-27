// app/student/career.tsx
// Route: /student/career
// UniPathway — My Career Explorer

import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, Pressable, useWindowDimensions,
  Platform, Modal, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DashboardLayout, {
  spacing, typography, radii, useTheme,
} from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type InstType = 'University' | 'College' | 'Brigade';
type Demand   = 'Very High' | 'High' | 'Moderate' | 'Low';

type Institution = {
  name: string; type: InstType;
  programme: string; duration: string;
  minPoints: number; minGrade: string; fee: string;
};

type Role = {
  id: string; title: string; description: string;
  avgSalary: string; demand: Demand; yearsStudy: string;
  icon: keyof typeof Ionicons.glyphMap;
  institutions: Institution[];
};

type Field = {
  id: string; label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string; bgColor: string; tagline: string;
  roles: Role[];
};

type View3 = 'fields' | 'roles' | 'detail';

// ─────────────────────────────────────────────────────────────────────────────
// Career data
// ─────────────────────────────────────────────────────────────────────────────
const FIELDS: Field[] = [
  {
    id:'medical', label:'Medical & Health', icon:'medkit-outline',
    color:'#F87171', bgColor:'#7F1D1D', tagline:'Save lives, transform communities',
    roles:[
      { id:'surgeon', title:'Surgeon', icon:'cut-outline',
        description:'Perform complex operations across specialisations including brain, cardiac, orthopaedic and plastic surgery.',
        avgSalary:'BWP 18,000 – 45,000/mo', demand:'Very High', yearsStudy:'7 – 10 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'MBChB Medicine & Surgery', duration:'5 years', minPoints:42, minGrade:'A in Biology & Chemistry', fee:'BWP 28,000/yr' },
          { name:'University of Botswana', type:'University', programme:'Postgrad Surgery Residency', duration:'3–5 years', minPoints:44, minGrade:'MBChB + Internship', fee:'BWP 12,000/yr' },
        ],
      },
      { id:'nurse', title:'Registered Nurse', icon:'heart-outline',
        description:'Coordinate patient care, educate patients on health conditions and provide emotional support.',
        avgSalary:'BWP 5,500 – 12,000/mo', demand:'Very High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'Bachelor of Nursing Science', duration:'4 years', minPoints:36, minGrade:'B in Biology', fee:'BWP 18,000/yr' },
          { name:'Botswana Health Professions', type:'College', programme:'Diploma in Nursing', duration:'3 years', minPoints:32, minGrade:'C in Biology', fee:'BWP 10,000/yr' },
          { name:'Bokamoso Private Hospital', type:'College', programme:'Certificate in Nursing', duration:'2 years', minPoints:28, minGrade:'C in Sciences', fee:'BWP 8,500/yr' },
        ],
      },
      { id:'pharmacist', title:'Pharmacist', icon:'flask-outline',
        description:'Dispense prescriptions, advise on drug interactions and ensure safe medication use.',
        avgSalary:'BWP 8,000 – 18,000/mo', demand:'High', yearsStudy:'4 – 5 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'Bachelor of Pharmacy (BPharm)', duration:'4 years', minPoints:38, minGrade:'B in Chemistry & Biology', fee:'BWP 22,000/yr' },
          { name:'Limkokwing University', type:'University', programme:'Diploma in Pharmaceutical Science', duration:'2 years', minPoints:34, minGrade:'C in Chemistry', fee:'BWP 14,000/yr' },
        ],
      },
      { id:'dentist', title:'Dentist', icon:'happy-outline',
        description:'Diagnose and treat problems with teeth, gums and related oral structures.',
        avgSalary:'BWP 10,000 – 25,000/mo', demand:'High', yearsStudy:'5 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'Bachelor of Dental Surgery (BDS)', duration:'5 years', minPoints:40, minGrade:'A in Biology & Chemistry', fee:'BWP 26,000/yr' },
        ],
      },
      { id:'radiographer', title:'Radiographer', icon:'scan-outline',
        description:'Use imaging equipment — X-rays, CT and MRI — to diagnose and monitor patient conditions.',
        avgSalary:'BWP 6,000 – 13,000/mo', demand:'High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'BSc Radiography', duration:'4 years', minPoints:36, minGrade:'B in Physics & Biology', fee:'BWP 20,000/yr' },
          { name:'Gaborone Institute of Professional Studies', type:'College', programme:'Diploma in Diagnostic Imaging', duration:'3 years', minPoints:30, minGrade:'C in Sciences', fee:'BWP 11,000/yr' },
        ],
      },
    ],
  },
  {
    id:'technology', label:'Technology & IT', icon:'code-slash-outline',
    color:'#60A5FA', bgColor:'#1E3A5F', tagline:'Build the digital future of Botswana',
    roles:[
      { id:'software-engineer', title:'Software Engineer', icon:'laptop-outline',
        description:'Design, develop and maintain software applications and platforms used across all industries.',
        avgSalary:'BWP 8,000 – 22,000/mo', demand:'Very High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'BSc Computer Science', duration:'4 years', minPoints:36, minGrade:'B in Mathematics', fee:'BWP 19,000/yr' },
          { name:'Botswana Accountancy College', type:'College', programme:'BSc Information Technology', duration:'3 years', minPoints:34, minGrade:'C in Mathematics', fee:'BWP 16,000/yr' },
          { name:'Limkokwing University', type:'University', programme:'BSc Software Engineering', duration:'3 years', minPoints:32, minGrade:'C in Mathematics', fee:'BWP 17,500/yr' },
        ],
      },
      { id:'cybersecurity', title:'Cybersecurity Analyst', icon:'shield-checkmark-outline',
        description:'Protect systems and networks from information disclosure, theft and damage to data.',
        avgSalary:'BWP 10,000 – 28,000/mo', demand:'Very High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'BSc Cybersecurity', duration:'4 years', minPoints:36, minGrade:'B in Mathematics', fee:'BWP 20,000/yr' },
          { name:'BIUST', type:'University', programme:'BSc Computer & Information Security', duration:'4 years', minPoints:38, minGrade:'B in Mathematics & Physics', fee:'BWP 22,000/yr' },
        ],
      },
      { id:'data-scientist', title:'Data Scientist', icon:'bar-chart-outline',
        description:'Analyse and interpret complex digital data to help organisations make smarter decisions.',
        avgSalary:'BWP 12,000 – 30,000/mo', demand:'Very High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'BIUST', type:'University', programme:'BSc Data Science & Analytics', duration:'4 years', minPoints:38, minGrade:'B in Mathematics', fee:'BWP 21,000/yr' },
          { name:'University of Botswana', type:'University', programme:'BSc Statistics & Data Science', duration:'4 years', minPoints:36, minGrade:'B in Mathematics', fee:'BWP 19,000/yr' },
        ],
      },
      { id:'network-engineer', title:'Network Engineer', icon:'wifi-outline',
        description:'Design and implement computer networks and telecommunications infrastructure.',
        avgSalary:'BWP 7,000 – 18,000/mo', demand:'High', yearsStudy:'3 years',
        institutions:[
          { name:'Botswana Accountancy College', type:'College', programme:'Diploma in Network Engineering', duration:'3 years', minPoints:32, minGrade:'C in Mathematics', fee:'BWP 14,000/yr' },
          { name:'GIPS', type:'College', programme:'Certificate in Cisco Networking', duration:'1 year', minPoints:28, minGrade:'C in Mathematics', fee:'BWP 9,000/yr' },
        ],
      },
    ],
  },
  {
    id:'engineering', label:'Engineering', icon:'construct-outline',
    color:'#FBBF24', bgColor:'#78350F', tagline:'Build the infrastructure of tomorrow',
    roles:[
      { id:'civil-engineer', title:'Civil Engineer', icon:'business-outline',
        description:'Design and oversee infrastructure projects: roads, bridges, dams and buildings.',
        avgSalary:'BWP 9,000 – 25,000/mo', demand:'Very High', yearsStudy:'4 – 5 years',
        institutions:[
          { name:'BIUST', type:'University', programme:'BEng Civil Engineering', duration:'4 years', minPoints:40, minGrade:'B in Mathematics & Physics', fee:'BWP 24,000/yr' },
          { name:'University of Botswana', type:'University', programme:'BSc Civil Engineering', duration:'4 years', minPoints:38, minGrade:'B in Mathematics', fee:'BWP 22,000/yr' },
        ],
      },
      { id:'mechanical-engineer', title:'Mechanical Engineer', icon:'settings-outline',
        description:'Design, manufacture and maintain mechanical systems from engines to industrial machinery.',
        avgSalary:'BWP 8,500 – 22,000/mo', demand:'High', yearsStudy:'4 years',
        institutions:[
          { name:'BIUST', type:'University', programme:'BEng Mechanical Engineering', duration:'4 years', minPoints:40, minGrade:'B in Mathematics & Physics', fee:'BWP 24,000/yr' },
        ],
      },
      { id:'electrical-engineer', title:'Electrical Engineer', icon:'flash-outline',
        description:'Design and maintain electrical systems including power generation, distribution and electronics.',
        avgSalary:'BWP 9,000 – 24,000/mo', demand:'High', yearsStudy:'4 years',
        institutions:[
          { name:'BIUST', type:'University', programme:'BEng Electrical & Electronics Engineering', duration:'4 years', minPoints:40, minGrade:'B in Mathematics & Physics', fee:'BWP 24,000/yr' },
          { name:'Gaborone Technical College', type:'College', programme:'Diploma in Electrical Engineering', duration:'3 years', minPoints:32, minGrade:'C in Mathematics & Physics', fee:'BWP 12,000/yr' },
          { name:'Francistown Brigade', type:'Brigade', programme:'Certificate in Electrical Installation', duration:'2 years', minPoints:24, minGrade:'D in Mathematics', fee:'BWP 6,500/yr' },
        ],
      },
      { id:'mining-engineer', title:'Mining Engineer', icon:'layers-outline',
        description:'Plan and manage the safe extraction of minerals and resources from the earth.',
        avgSalary:'BWP 12,000 – 30,000/mo', demand:'Very High', yearsStudy:'4 years',
        institutions:[
          { name:'BIUST', type:'University', programme:'BEng Mining Engineering', duration:'4 years', minPoints:40, minGrade:'B in Mathematics & Chemistry', fee:'BWP 25,000/yr' },
          { name:'Debswana Training Centre', type:'College', programme:'Diploma in Mine Operations', duration:'2 years', minPoints:30, minGrade:'C in Mathematics', fee:'BWP 9,000/yr' },
        ],
      },
    ],
  },
  {
    id:'business', label:'Business & Finance', icon:'briefcase-outline',
    color:'#34D399', bgColor:'#064E3B', tagline:'Drive growth, lead organisations',
    roles:[
      { id:'accountant', title:'Chartered Accountant', icon:'calculator-outline',
        description:'Manage financial records, tax returns and provide expert financial advice.',
        avgSalary:'BWP 7,000 – 20,000/mo', demand:'Very High', yearsStudy:'3–4 yrs + articles',
        institutions:[
          { name:'Botswana Accountancy College', type:'College', programme:'BCom Accounting', duration:'3 years', minPoints:34, minGrade:'B in Mathematics', fee:'BWP 16,000/yr' },
          { name:'University of Botswana', type:'University', programme:'BCom Accounting & Finance', duration:'3 years', minPoints:36, minGrade:'B in Mathematics', fee:'BWP 17,000/yr' },
          { name:'ACCA Botswana', type:'College', programme:'ACCA Professional Qualification', duration:'3–5 years', minPoints:30, minGrade:'C in Mathematics', fee:'BWP 8,000/yr' },
        ],
      },
      { id:'banker', title:'Investment Banker', icon:'trending-up-outline',
        description:'Raise capital, advise on mergers and acquisitions, and manage financial portfolios.',
        avgSalary:'BWP 10,000 – 35,000/mo', demand:'High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'BCom Finance & Banking', duration:'3 years', minPoints:36, minGrade:'B in Mathematics', fee:'BWP 17,500/yr' },
          { name:'Botswana Accountancy College', type:'College', programme:'Diploma in Banking & Finance', duration:'2 years', minPoints:32, minGrade:'C in Mathematics', fee:'BWP 13,000/yr' },
        ],
      },
      { id:'entrepreneur', title:'Entrepreneur', icon:'rocket-outline',
        description:'Start and grow your own ventures, creating jobs and driving economic value.',
        avgSalary:'Variable — unlimited potential', demand:'High', yearsStudy:'2 – 3 years',
        institutions:[
          { name:'Botswana Innovation Hub', type:'College', programme:'Certificate in Entrepreneurship & Innovation', duration:'1 year', minPoints:24, minGrade:'C in English', fee:'BWP 6,000/yr' },
          { name:'Limkokwing University', type:'University', programme:'BA Entrepreneurship', duration:'3 years', minPoints:30, minGrade:'C in English & Mathematics', fee:'BWP 15,000/yr' },
        ],
      },
    ],
  },
  {
    id:'law', label:'Law & Justice', icon:'scale-outline',
    color:'#A78BFA', bgColor:'#3B0764', tagline:'Uphold justice, protect rights',
    roles:[
      { id:'advocate', title:'Advocate / Lawyer', icon:'document-text-outline',
        description:'Represent clients in court, draft legal documents and advise across civil, criminal and commercial law.',
        avgSalary:'BWP 8,000 – 30,000/mo', demand:'High', yearsStudy:'4 – 5 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'LLB Bachelor of Laws', duration:'4 years', minPoints:38, minGrade:'B in English', fee:'BWP 19,000/yr' },
          { name:'Botswana University of Agriculture', type:'University', programme:'LLB Laws', duration:'4 years', minPoints:36, minGrade:'B in English', fee:'BWP 17,000/yr' },
        ],
      },
      { id:'magistrate', title:'Magistrate / Judge', icon:'hammer-outline',
        description:'Preside over court proceedings, interpret laws and deliver judgements in civil and criminal cases.',
        avgSalary:'BWP 15,000 – 40,000/mo', demand:'Moderate', yearsStudy:'5+ years + LLM',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'LLB + LLM Judicial Studies', duration:'5–6 years', minPoints:42, minGrade:'A in English', fee:'BWP 22,000/yr' },
        ],
      },
      { id:'prosecutor', title:'State Prosecutor', icon:'shield-outline',
        description:'Represent the state in criminal proceedings — gathering evidence and presenting cases before courts.',
        avgSalary:'BWP 7,000 – 18,000/mo', demand:'Moderate', yearsStudy:'4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'LLB Bachelor of Laws', duration:'4 years', minPoints:38, minGrade:'B in English', fee:'BWP 19,000/yr' },
        ],
      },
    ],
  },
  {
    id:'education', label:'Education', icon:'school-outline',
    color:'#38BDF8', bgColor:'#0C4A6E', tagline:'Shape the next generation',
    roles:[
      { id:'teacher', title:'Secondary School Teacher', icon:'people-outline',
        description:'Educate and inspire students at secondary level, specialising in mathematics, sciences or humanities.',
        avgSalary:'BWP 4,500 – 9,000/mo', demand:'Very High', yearsStudy:'4 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'Bachelor of Education (Secondary)', duration:'4 years', minPoints:32, minGrade:'C in relevant subjects', fee:'BWP 16,000/yr' },
          { name:'Francistown College of Education', type:'College', programme:'Diploma in Secondary Education', duration:'3 years', minPoints:28, minGrade:'C in English', fee:'BWP 10,000/yr' },
          { name:'Lobatse College of Education', type:'College', programme:'Diploma in Primary Education', duration:'3 years', minPoints:26, minGrade:'C in English', fee:'BWP 9,500/yr' },
        ],
      },
      { id:'lecturer', title:'University Lecturer', icon:'library-outline',
        description:'Teach and research at tertiary level, advancing knowledge in your specialist field.',
        avgSalary:'BWP 9,000 – 22,000/mo', demand:'High', yearsStudy:'6 – 8 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'BSc/BA (Hons) + Masters + PhD', duration:'8+ years', minPoints:40, minGrade:'A in relevant field', fee:'BWP 20,000/yr' },
          { name:'BIUST', type:'University', programme:'BEng/BSc + Postgraduate Studies', duration:'6+ years', minPoints:40, minGrade:'A in Science/Tech', fee:'BWP 22,000/yr' },
        ],
      },
    ],
  },
  {
    id:'arts', label:'Creative & Arts', icon:'color-palette-outline',
    color:'#FB7185', bgColor:'#881337', tagline:'Express, design, and inspire',
    roles:[
      { id:'graphic-designer', title:'Graphic Designer', icon:'brush-outline',
        description:'Create visual content through typography, imagery and layout for print and digital media.',
        avgSalary:'BWP 4,000 – 12,000/mo', demand:'High', yearsStudy:'2 – 3 years',
        institutions:[
          { name:'Limkokwing University', type:'University', programme:'BA (Hons) Graphic Design', duration:'3 years', minPoints:28, minGrade:'C in English & Art', fee:'BWP 16,000/yr' },
          { name:'GIPS', type:'College', programme:'Diploma in Graphic Design & Media', duration:'2 years', minPoints:24, minGrade:'C in English', fee:'BWP 10,000/yr' },
        ],
      },
      { id:'architect', title:'Architect', icon:'map-outline',
        description:'Design buildings and spaces that are functional, safe and aesthetically remarkable.',
        avgSalary:'BWP 8,000 – 22,000/mo', demand:'High', yearsStudy:'5 – 6 years',
        institutions:[
          { name:'University of Botswana', type:'University', programme:'Bachelor of Architecture (BArch)', duration:'5 years', minPoints:36, minGrade:'B in Mathematics & Art', fee:'BWP 22,000/yr' },
          { name:'Limkokwing University', type:'University', programme:'BA Interior Architecture & Design', duration:'3 years', minPoints:30, minGrade:'C in Art & Mathematics', fee:'BWP 17,000/yr' },
        ],
      },
    ],
  },
  {
    id:'agriculture', label:'Agriculture & Environment', icon:'leaf-outline',
    color:'#86EFAC', bgColor:'#14532D', tagline:'Feed the nation, sustain the earth',
    roles:[
      { id:'agronomist', title:'Agronomist', icon:'nutrition-outline',
        description:'Apply science to improve crop production and solve problems related to soil, climate and plant disease.',
        avgSalary:'BWP 5,000 – 14,000/mo', demand:'High', yearsStudy:'3 – 4 years',
        institutions:[
          { name:'BUAN', type:'University', programme:'BSc Agronomy', duration:'4 years', minPoints:32, minGrade:'C in Biology & Chemistry', fee:'BWP 15,000/yr' },
          { name:'Ramokgwebana Agricultural College', type:'College', programme:'Diploma in Agriculture', duration:'3 years', minPoints:26, minGrade:'C in Biology', fee:'BWP 8,000/yr' },
        ],
      },
      { id:'vet', title:'Veterinary Surgeon', icon:'paw-outline',
        description:'Diagnose and treat diseases and injuries in animals from livestock to wildlife.',
        avgSalary:'BWP 8,000 – 20,000/mo', demand:'High', yearsStudy:'5 years',
        institutions:[
          { name:'BUAN', type:'University', programme:'Bachelor of Veterinary Medicine (BVM)', duration:'5 years', minPoints:40, minGrade:'B in Biology & Chemistry', fee:'BWP 24,000/yr' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function demandColor(d: Demand, c: ReturnType<typeof useTheme>) {
  switch (d) {
    case 'Very High': return c.success;
    case 'High':      return '#60A5FA';
    case 'Moderate':  return c.warning;
    case 'Low':       return c.danger;
  }
}

function typeStyle(t: InstType) {
  switch (t) {
    case 'University': return { bg:'#172554', text:'#60A5FA' };
    case 'College':    return { bg:'#14532D', text:'#34D399' };
    case 'Brigade':    return { bg:'#78350F', text:'#FBBF24' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable chip
// ─────────────────────────────────────────────────────────────────────────────
function Chip({ icon, label, tint, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; tint?: string; colors: any }) {
  const bg = tint ? `${tint}18` : colors.surfaceAlt;
  const bc = tint ? `${tint}33` : colors.border;
  const tc = tint ?? colors.textSecondary;
  return (
    <View style={{ flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:spacing(2), paddingVertical:spacing(1), backgroundColor:bg, borderRadius:radii.pill, borderWidth:1, borderColor:bc }}>
      <Ionicons name={icon} size={10} color={tc} />
      <Text style={{ fontSize:10, fontWeight:'600', color:tc }}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Institution detail bottom-sheet modal
// ─────────────────────────────────────────────────────────────────────────────
function InstModal({ inst, visible, onClose, colors, isMobile }:
  { inst: Institution|null; visible:boolean; onClose:()=>void; colors:any; isMobile:boolean }) {
  if (!inst) return null;
  const ts = typeStyle(inst.type);
  return (
    <Modal visible={visible} transparent animationType={isMobile?'slide':'fade'} onRequestClose={onClose}>
      <Pressable
        style={{ flex:1, backgroundColor:'rgba(0,0,0,0.72)', justifyContent:isMobile?'flex-end':'center', alignItems:'center', padding:isMobile?0:spacing(5) }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width:isMobile?'100%':'92%', maxWidth:480,
            backgroundColor:colors.surface,
            borderTopLeftRadius:radii.xxl, borderTopRightRadius:radii.xxl,
            borderBottomLeftRadius:isMobile?0:radii.xxl, borderBottomRightRadius:isMobile?0:radii.xxl,
            borderWidth:1, borderColor:colors.border, overflow:'hidden',
            paddingBottom:isMobile?spacing(10):0,
          }}
          onPress={e=>e.stopPropagation()}
        >
          <View style={{ height:3, backgroundColor:colors.primary }} />
          {isMobile && <View style={{ alignItems:'center', paddingTop:spacing(3) }}><View style={{ width:40, height:4, borderRadius:2, backgroundColor:colors.border }} /></View>}
          <View style={{ padding:spacing(6) }}>
            {/* Header */}
            <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:spacing(5) }}>
              <View style={{ flex:1, paddingRight:spacing(3) }}>
                <View style={{ flexDirection:'row', gap:spacing(2), marginBottom:spacing(2) }}>
                  <View style={{ paddingHorizontal:spacing(3), paddingVertical:spacing(1), backgroundColor:ts.bg, borderRadius:radii.pill }}>
                    <Text style={{ fontSize:10, fontWeight:'800', color:ts.text, letterSpacing:0.5 }}>{inst.type.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[typography.h2,{ color:colors.textPrimary }]}>{inst.name}</Text>
                <Text style={[typography.body,{ color:colors.primary, marginTop:spacing(1) }]}>{inst.programme}</Text>
              </View>
              <Pressable onPress={onClose} style={({ pressed })=>({ width:36, height:36, borderRadius:radii.pill, backgroundColor:colors.surfaceAlt, alignItems:'center' as const, justifyContent:'center' as const, opacity:pressed?0.7:1 })}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            {/* Stats */}
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing(3), marginBottom:spacing(5) }}>
              {([
                { label:'Duration',   value:inst.duration,         icon:'time-outline'   as const },
                { label:'Min Points', value:`${inst.minPoints} pts`, icon:'star-outline'   as const },
                { label:'Min Grade',  value:inst.minGrade,         icon:'ribbon-outline' as const },
                { label:'Annual Fee', value:inst.fee,              icon:'card-outline'   as const },
              ] as const).map(s=>(
                <View key={s.label} style={{ flex:1, minWidth:130, backgroundColor:colors.surfaceAlt, borderRadius:radii.lg, borderWidth:1, borderColor:colors.border, padding:spacing(4) }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:spacing(2), marginBottom:spacing(2) }}>
                    <Ionicons name={s.icon} size={12} color={colors.textMuted} />
                    <Text style={[typography.caption,{ color:colors.textMuted, letterSpacing:0.4 }]}>{s.label.toUpperCase()}</Text>
                  </View>
                  <Text style={[typography.bodyStrong,{ color:colors.textPrimary }]}>{s.value}</Text>
                </View>
              ))}
            </View>
            {/* Info */}
            <View style={{ flexDirection:'row', alignItems:'flex-start', gap:spacing(3), padding:spacing(4), backgroundColor:`${colors.primary}12`, borderRadius:radii.lg, borderLeftWidth:3, borderLeftColor:colors.primary }}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginTop:1, flexShrink:0 }} />
              <Text style={[typography.caption,{ color:colors.textSecondary, flex:1, lineHeight:18 }]}>
                You need at least {inst.minPoints} points from your best 6 subjects, including {inst.minGrade}.
              </Text>
            </View>
            {/* CTA */}
            <Pressable onPress={()=>{ onClose(); router.push('/student/enter-results'); }}
              style={({ pressed })=>({ marginTop:spacing(5), height:54, borderRadius:radii.lg, backgroundColor:colors.primary, flexDirection:'row' as const, alignItems:'center' as const, justifyContent:'center' as const, gap:spacing(2), opacity:pressed?0.9:1 })}>
              <Ionicons name="calculator-outline" size={18} color="#fff" />
              <Text style={[typography.label,{ color:'#fff', letterSpacing:0.3 }]}>Check My Eligibility</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Detail view for a selected role
// ─────────────────────────────────────────────────────────────────────────────
function DetailView({ field, role, colors, isMobile, onBack }:
  { field:Field; role:Role; colors:any; isMobile:boolean; onBack:()=>void }) {
  const [selInst,    setSelInst]    = useState<Institution|null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const dc = demandColor(role.demand, colors);

  return (
    <View>
      {/* Back */}
      <Pressable onPress={onBack} style={({ pressed })=>({ flexDirection:'row', alignItems:'center', gap:spacing(2), alignSelf:'flex-start', marginBottom:spacing(5), paddingHorizontal:spacing(4), paddingVertical:spacing(2), borderRadius:radii.lg, backgroundColor:colors.surfaceAlt, borderWidth:1, borderColor:colors.border, opacity:pressed?0.8:1 })}>
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={[typography.label,{ color:colors.primary }]}>Back to {field.label}</Text>
      </Pressable>

      {/* Hero */}
      <View style={{ backgroundColor:colors.surface, borderRadius:radii.xxl, borderWidth:1, borderColor:colors.border, overflow:'hidden', marginBottom:spacing(5) }}>
        <View style={{ height:4, backgroundColor:field.color }} />
        <View style={{ padding:isMobile?spacing(5):spacing(7) }}>
          {/* Title row */}
          <View style={{ flexDirection:'row', alignItems:'flex-start', gap:spacing(4), marginBottom:spacing(4) }}>
            <View style={{ width:isMobile?52:64, height:isMobile?52:64, borderRadius:radii.xl, backgroundColor:`${field.color}22`, borderWidth:1, borderColor:`${field.color}44`, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Ionicons name={role.icon} size={isMobile?24:30} color={field.color} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={[typography.caption,{ color:field.color, fontWeight:'700', letterSpacing:0.5, marginBottom:spacing(1) }]}>{field.label.toUpperCase()}</Text>
              <Text style={{ fontSize:isMobile?22:28, fontWeight:'900', color:colors.textPrimary, lineHeight:isMobile?28:34 }}>{role.title}</Text>
            </View>
          </View>
          <Text style={[typography.body,{ color:colors.textSecondary, lineHeight:24, marginBottom:spacing(5) }]}>{role.description}</Text>
          {/* Stats */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing(3) }}>
            {[
              { label:'Avg Salary',   value:role.avgSalary,  icon:'cash-outline'      as const, tint:colors.success },
              { label:'Job Demand',   value:role.demand,     icon:'pulse-outline'     as const, tint:dc             },
              { label:'Study Length', value:role.yearsStudy, icon:'hourglass-outline' as const, tint:colors.primary },
              { label:'Programmes',   value:`${role.institutions.length} listed`, icon:'school-outline' as const, tint:colors.warning },
            ].map(s=>(
              <View key={s.label} style={{ flex:1, minWidth:isMobile?140:160, backgroundColor:`${s.tint}0F`, borderRadius:radii.lg, borderWidth:1, borderColor:`${s.tint}30`, padding:spacing(4) }}>
                <View style={{ flexDirection:'row', alignItems:'center', gap:spacing(2), marginBottom:spacing(2) }}>
                  <Ionicons name={s.icon} size={12} color={s.tint} />
                  <Text style={[typography.caption,{ color:colors.textMuted, letterSpacing:0.4, fontSize:10 }]}>{s.label.toUpperCase()}</Text>
                </View>
                <Text style={[typography.bodyStrong,{ color:s.tint, fontSize:isMobile?12:13 }]} numberOfLines={2}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Institutions */}
      <View style={{ backgroundColor:colors.surface, borderRadius:radii.xxl, borderWidth:1, borderColor:colors.border, overflow:'hidden' }}>
        <View style={{ height:3, backgroundColor:colors.primary }} />
        <View style={{ padding:isMobile?spacing(5):spacing(6) }}>
          <Text style={[typography.caption,{ color:colors.textMuted, letterSpacing:0.5, marginBottom:spacing(2) }]}>AVAILABLE PROGRAMMES</Text>
          <Text style={[typography.h2,{ color:colors.textPrimary, marginBottom:spacing(5) }]}>Where to Study</Text>
          <View style={{ gap:spacing(4) }}>
            {role.institutions.map((inst,idx)=>{
              const ts = typeStyle(inst.type);
              return (
                <Pressable key={idx} onPress={()=>{ setSelInst(inst); setShowModal(true); }}
                  style={({ pressed })=>({ backgroundColor:colors.surfaceAlt, borderRadius:radii.xl, borderWidth:1, borderColor:colors.border, padding:spacing(5), opacity:pressed?0.88:1, transform:pressed?[{scale:0.99}]:[], ...Platform.select({ web:{ cursor:'pointer' } as any }) })}>
                  <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', gap:spacing(3), marginBottom:spacing(3) }}>
                    <View style={{ flex:1 }}>
                      <View style={{ flexDirection:'row', marginBottom:spacing(2) }}>
                        <View style={{ paddingHorizontal:spacing(2), paddingVertical:2, backgroundColor:ts.bg, borderRadius:radii.pill }}>
                          <Text style={{ fontSize:9, fontWeight:'800', color:ts.text, letterSpacing:0.5 }}>{inst.type.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={[typography.bodyStrong,{ color:colors.textPrimary }]}>{inst.name}</Text>
                      <Text style={[typography.caption,{ color:colors.primary, marginTop:spacing(1) }]}>{inst.programme}</Text>
                    </View>
                    <View style={{ backgroundColor:`${colors.primary}18`, borderRadius:radii.lg, padding:spacing(2) }}>
                      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing(2) }}>
                    <Chip icon="time-outline"  label={inst.duration}            colors={colors} />
                    <Chip icon="star-outline"  label={`Min. ${inst.minPoints} pts`} colors={colors} />
                    <Chip icon="card-outline"  label={inst.fee}                 colors={colors} />
                  </View>
                </Pressable>
              );
            })}
          </View>
          {/* Eligibility CTA */}
          <Pressable onPress={()=>router.push('/student/enter-results')}
            style={({ pressed })=>({ marginTop:spacing(6), height:isMobile?60:56, borderRadius:radii.xl, backgroundColor:colors.primary, flexDirection:'row' as const, alignItems:'center' as const, justifyContent:'center' as const, gap:spacing(3), opacity:pressed?0.9:1 })}>
            <Ionicons name="calculator-outline" size={20} color="#fff" />
            <Text style={[typography.label,{ color:'#fff', letterSpacing:0.6, fontSize:14 }]}>CALCULATE MY ELIGIBILITY</Text>
          </Pressable>
        </View>
      </View>

      <InstModal inst={selInst} visible={showModal} onClose={()=>setShowModal(false)} colors={colors} isMobile={isMobile} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Roles list for a field
// ─────────────────────────────────────────────────────────────────────────────
function RolesView({ field, colors, isMobile, onBack, onSelect }:
  { field:Field; colors:any; isMobile:boolean; onBack:()=>void; onSelect:(r:Role)=>void }) {
  return (
    <View>
      <Pressable onPress={onBack} style={({ pressed })=>({ flexDirection:'row', alignItems:'center', gap:spacing(2), alignSelf:'flex-start', marginBottom:spacing(5), paddingHorizontal:spacing(4), paddingVertical:spacing(2), borderRadius:radii.lg, backgroundColor:colors.surfaceAlt, borderWidth:1, borderColor:colors.border, opacity:pressed?0.8:1 })}>
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={[typography.label,{ color:colors.primary }]}>All Fields</Text>
      </Pressable>

      {/* Field banner */}
      <View style={{ backgroundColor:field.bgColor, borderRadius:radii.xxl, borderWidth:1, borderColor:`${field.color}33`, padding:isMobile?spacing(5):spacing(7), marginBottom:spacing(5), overflow:'hidden' }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:spacing(4) }}>
          <View style={{ width:60, height:60, borderRadius:radii.xl, backgroundColor:`${field.color}22`, borderWidth:2, borderColor:`${field.color}55`, alignItems:'center', justifyContent:'center' }}>
            <Ionicons name={field.icon} size={28} color={field.color} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={{ fontSize:isMobile?22:28, fontWeight:'900', color:'#fff', lineHeight:isMobile?28:34 }}>{field.label}</Text>
            <Text style={[typography.body,{ color:`${field.color}CC`, marginTop:spacing(1) }]}>{field.tagline}</Text>
          </View>
        </View>
        <View style={{ marginTop:spacing(4) }}>
          <View style={{ alignSelf:'flex-start', paddingHorizontal:spacing(3), paddingVertical:spacing(2), backgroundColor:'rgba(0,0,0,0.3)', borderRadius:radii.pill, borderWidth:1, borderColor:`${field.color}44` }}>
            <Text style={[typography.caption,{ color:field.color, fontWeight:'700' }]}>{field.roles.length} career paths available</Text>
          </View>
        </View>
      </View>

      <Text style={[typography.caption,{ color:colors.textMuted, letterSpacing:0.5, marginBottom:spacing(4) }]}>SELECT A CAREER TO EXPLORE</Text>

      <View style={{ gap:spacing(3) }}>
        {field.roles.map(role=>{
          const dc = demandColor(role.demand, colors);
          return (
            <Pressable key={role.id} onPress={()=>onSelect(role)}
              style={({ pressed })=>({ backgroundColor:colors.surface, borderRadius:radii.xxl, borderWidth:1, borderColor:colors.border, overflow:'hidden', opacity:pressed?0.9:1, transform:pressed?[{scale:0.99}]:[], ...Platform.select({ web:{ cursor:'pointer' } as any }) })}>
              <View style={{ height:2, backgroundColor:field.color, opacity:0.6 }} />
              <View style={{ padding:isMobile?spacing(4):spacing(5), flexDirection:'row', alignItems:'center', gap:spacing(4) }}>
                {/* Icon */}
                <View style={{ width:isMobile?48:56, height:isMobile?48:56, borderRadius:radii.xl, backgroundColor:`${field.color}18`, borderWidth:1, borderColor:`${field.color}33`, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ionicons name={role.icon} size={isMobile?22:26} color={field.color} />
                </View>
                {/* Text */}
                <View style={{ flex:1, minWidth:0 }}>
                  <Text style={[typography.bodyStrong,{ color:colors.textPrimary, fontSize:isMobile?15:16 }]}>{role.title}</Text>
                  <Text style={[typography.caption,{ color:colors.textSecondary, marginTop:spacing(1), lineHeight:17 }]} numberOfLines={2}>{role.description}</Text>
                  <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing(2), marginTop:spacing(2) }}>
                    <Chip icon="pulse-outline"     label={`${role.demand} Demand`} tint={dc}    colors={colors} />
                    <Chip icon="hourglass-outline" label={role.yearsStudy}                       colors={colors} />
                    <Chip icon="school-outline"    label={`${role.institutions.length} progs`}   colors={colors} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ flexShrink:0 }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Fields grid with search
// ─────────────────────────────────────────────────────────────────────────────
function FieldsView({ colors, isMobile, isTablet, query, onQuery, onSelect }:
  { colors:any; isMobile:boolean; isTablet:boolean; query:string; onQuery:(q:string)=>void; onSelect:(f:Field)=>void }) {

  const filtered = useMemo(()=>{
    if (!query.trim()) return FIELDS;
    const q = query.toLowerCase();
    return FIELDS.filter(f=>
      f.label.toLowerCase().includes(q) ||
      f.roles.some(r=>r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    );
  },[query]);

  const cols      = isMobile ? 2 : isTablet ? 3 : 4;
  const totalRoles = FIELDS.reduce((s,f)=>s+f.roles.length,0);
  const totalProgs = FIELDS.reduce((s,f)=>s+f.roles.reduce((rs,r)=>rs+r.institutions.length,0),0);

  return (
    <View>
      {/* Hero banner */}
      <View style={{ backgroundColor:colors.surface, borderRadius:radii.xxl, borderWidth:1, borderColor:colors.border, overflow:'hidden', marginBottom:spacing(6) }}>
        <View style={{ height:3, backgroundColor:colors.warning }} />
        <View style={{ padding:isMobile?spacing(5):spacing(7) }}>
          {/* Badge */}
          <View style={{ alignSelf:'flex-start', flexDirection:'row', alignItems:'center', gap:spacing(2), paddingHorizontal:spacing(3), paddingVertical:spacing(2), backgroundColor:`${colors.warning}22`, borderRadius:radii.pill, borderWidth:1, borderColor:`${colors.warning}44`, marginBottom:spacing(4) }}>
            <Ionicons name="compass-outline" size={12} color={colors.warning} />
            <Text style={[typography.caption,{ color:colors.warning, fontWeight:'700', letterSpacing:0.5 }]}>CAREER EXPLORER</Text>
          </View>
          <Text style={{ fontSize:isMobile?24:34, fontWeight:'900', color:colors.textPrimary, lineHeight:isMobile?30:40 }}>
            {'Discover Your\nCareer Path'}
          </Text>
          <Text style={[typography.body,{ color:colors.textSecondary, marginTop:spacing(3), lineHeight:24, maxWidth:540 }]}>
            Explore career fields, discover roles that inspire you, and find programmes at Botswana institutions that match your goals and qualifications.
          </Text>
          {/* Stats strip */}
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:spacing(3), marginTop:spacing(5) }}>
            {[
              { icon:'grid-outline'   as const, label:'Career Fields', value:`${FIELDS.length}`    },
              { icon:'person-outline' as const, label:'Career Roles',  value:`${totalRoles}`        },
              { icon:'school-outline' as const, label:'Programmes',    value:`${totalProgs}+`       },
            ].map(s=>(
              <View key={s.label} style={{ flex:1, minWidth:isMobile?80:140, backgroundColor:colors.surfaceAlt, borderRadius:radii.lg, borderWidth:1, borderColor:colors.border, padding:spacing(3), flexDirection:'row', alignItems:'center', gap:spacing(2) }}>
                <View style={{ width:28, height:28, borderRadius:radii.md, backgroundColor:`${colors.warning}22`, alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Ionicons name={s.icon} size={12} color={colors.warning} />
                </View>
                <View style={{ flex:1, minWidth:0 }}>
                  <Text style={[typography.caption,{ color:colors.textMuted, fontSize:10 }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[typography.label,{ color:colors.textPrimary }]}>{s.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={{ backgroundColor:colors.surface, borderRadius:radii.xl, borderWidth:1, borderColor:colors.border, flexDirection:'row', alignItems:'center', paddingHorizontal:spacing(4), marginBottom:spacing(6), height:52 }}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query} onChangeText={onQuery}
          placeholder="Search careers, fields or roles…"
          placeholderTextColor={colors.textMuted}
          style={[typography.body,{ flex:1, color:colors.textPrimary, marginLeft:spacing(3) }]}
          autoCorrect={false} autoCapitalize="none"
        />
        {query.length>0 && (
          <Pressable onPress={()=>onQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Section label */}
      <Text style={[typography.caption,{ color:colors.textMuted, letterSpacing:0.5, marginBottom:spacing(4) }]}>
        {filtered.length===FIELDS.length ? 'ALL CAREER FIELDS' : `${filtered.length} RESULT${filtered.length!==1?'S':''} FOUND`}
      </Text>

      {/* Grid */}
      <View style={{ flexDirection:'row', flexWrap:'wrap', marginHorizontal:-spacing(2) }}>
        {filtered.map(field=>(
          <View key={field.id} style={{ width:`${100/cols}%`, paddingHorizontal:spacing(2), marginBottom:spacing(4) }}>
            <Pressable onPress={()=>onSelect(field)}
              style={({ pressed })=>({ backgroundColor:colors.surface, borderRadius:radii.xxl, borderWidth:1.5, borderColor:`${field.color}33`, overflow:'hidden', opacity:pressed?0.88:1, transform:pressed?[{scale:0.97}]:[], ...Platform.select({ web:{ cursor:'pointer', transition:'transform 0.15s ease' } as any }) })}>
              <View style={{ height:3, backgroundColor:field.color }} />
              <View style={{ padding:isMobile?spacing(4):spacing(5), alignItems:'center' }}>
                {/* Icon */}
                <View style={{ width:isMobile?52:64, height:isMobile?52:64, borderRadius:9999, backgroundColor:field.bgColor, borderWidth:2, borderColor:`${field.color}44`, alignItems:'center', justifyContent:'center', marginBottom:spacing(3) }}>
                  <Ionicons name={field.icon} size={isMobile?22:28} color={field.color} />
                </View>
                <Text style={[typography.label,{ color:colors.textPrimary, textAlign:'center', fontSize:isMobile?11:13, lineHeight:isMobile?16:18, marginBottom:spacing(2) }]} numberOfLines={2}>{field.label}</Text>
                {/* Role count pill */}
                <View style={{ paddingHorizontal:spacing(2), paddingVertical:2, backgroundColor:`${field.color}18`, borderRadius:radii.pill, borderWidth:1, borderColor:`${field.color}33` }}>
                  <Text style={{ fontSize:10, fontWeight:'700', color:field.color }}>{field.roles.length} roles</Text>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </View>

      {filtered.length===0 && (
        <View style={{ alignItems:'center', padding:spacing(10) }}>
          <View style={{ width:64, height:64, borderRadius:32, backgroundColor:colors.surfaceAlt, alignItems:'center', justifyContent:'center', marginBottom:spacing(4) }}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={[typography.bodyStrong,{ color:colors.textSecondary, textAlign:'center' }]}>No careers found for "{query}"</Text>
          <Pressable onPress={()=>onQuery('')} style={{ marginTop:spacing(3) }}>
            <Text style={[typography.label,{ color:colors.primary }]}>Clear search</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────
function StepIndicator({ step, field, role, colors, isMobile }:
  { step:View3; field:Field|null; role:Role|null; colors:any; isMobile:boolean }) {
  const steps = [
    { key:'fields', label:'Field',  icon:'grid-outline'    as const },
    { key:'roles',  label:'Career', icon:'person-outline'  as const },
    { key:'detail', label:'Study',  icon:'school-outline'  as const },
  ];
  const activeIdx = steps.findIndex(s=>s.key===step);

  return (
    <View style={{ backgroundColor:colors.surface, borderRadius:radii.xl, borderWidth:1, borderColor:colors.border, padding:spacing(4), marginBottom:spacing(6), flexDirection:'row', alignItems:'center' }}>
      {steps.map((s, idx)=>{
        const done    = idx < activeIdx;
        const active  = idx === activeIdx;
        const coming  = idx > activeIdx;
        const stepColor = active ? colors.primary : done ? colors.success : colors.textMuted;
        return (
          <React.Fragment key={s.key}>
            <View style={{ alignItems:'center', flex:1 }}>
              <View style={{ width:isMobile?32:36, height:isMobile?32:36, borderRadius:18, backgroundColor:active?`${colors.primary}22`:done?`${colors.success}22`:colors.surfaceAlt, borderWidth:1.5, borderColor:active?colors.primary:done?colors.success:colors.border, alignItems:'center', justifyContent:'center', marginBottom:spacing(1) }}>
                {done
                  ? <Ionicons name="checkmark" size={14} color={colors.success} />
                  : <Ionicons name={s.icon} size={isMobile?13:15} color={stepColor} />
                }
              </View>
              <Text style={[typography.caption,{ color:stepColor, fontWeight:active?'700':'500', fontSize:isMobile?9:11 }]} numberOfLines={1}>
                {active&&field&&s.key==='roles' ? field.label.split(' ')[0]
                  : active&&role&&s.key==='detail' ? role.title.split(' ')[0]
                  : s.label}
              </Text>
            </View>
            {idx<steps.length-1 && (
              <View style={{ flex:1, height:1.5, backgroundColor:idx<activeIdx?colors.success:colors.border, marginBottom:spacing(4) }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen root
// ─────────────────────────────────────────────────────────────────────────────
function CareerContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const isMobile  = width < 768;
  const isTablet  = width >= 768 && width < 1024;

  const [viewState,   setViewState]   = useState<View3>('fields');
  const [activeField, setActiveField] = useState<Field|null>(null);
  const [activeRole,  setActiveRole]  = useState<Role|null>(null);
  const [query,       setQuery]       = useState('');

  const goField   = useCallback((f:Field)=>{ setActiveField(f); setViewState('roles'); },  []);
  const goRole    = useCallback((r:Role) =>{ setActiveRole(r);  setViewState('detail'); }, []);
  const backFields = useCallback(()=>{ setViewState('fields'); setActiveField(null); setActiveRole(null); }, []);
  const backRoles  = useCallback(()=>{ setViewState('roles');  setActiveRole(null); }, []);

  const breadcrumb = useMemo(()=>{
    if (viewState==='fields') return 'Dashboard › My Career';
    if (viewState==='roles')  return `Dashboard › My Career › ${activeField?.label}`;
    return `Dashboard › My Career › ${activeField?.label} › ${activeRole?.title}`;
  },[viewState,activeField,activeRole]);

  return (
    <DashboardLayout title="My Career" subtitle="Explore paths, discover opportunities" showPointsCard={false}>
      {/* Top nav row */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:spacing(3), marginBottom:spacing(6), flexWrap:'wrap' }}>
        <Pressable onPress={()=>router.back()}
          style={({ pressed })=>({ flexDirection:'row' as const, alignItems:'center' as const, gap:spacing(2), paddingHorizontal:spacing(4), paddingVertical:spacing(2), borderRadius:radii.lg, backgroundColor:colors.surfaceAlt, borderWidth:1, borderColor:colors.border, opacity:pressed?0.8:1 })}>
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label,{ color:colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[typography.caption,{ color:colors.textMuted, flex:1 }]} numberOfLines={1}>{breadcrumb}</Text>
      </View>

      {/* Step progress */}
      <StepIndicator step={viewState} field={activeField} role={activeRole} colors={colors} isMobile={isMobile} />

      {/* Views */}
      {viewState==='fields' && (
        <FieldsView colors={colors} isMobile={isMobile} isTablet={isTablet} query={query} onQuery={setQuery} onSelect={goField} />
      )}
      {viewState==='roles' && activeField && (
        <RolesView field={activeField} colors={colors} isMobile={isMobile} onBack={backFields} onSelect={goRole} />
      )}
      {viewState==='detail' && activeField && activeRole && (
        <DetailView field={activeField} role={activeRole} colors={colors} isMobile={isMobile} onBack={backRoles} />
      )}
    </DashboardLayout>
  );
}

export default function CareerScreen() {
  return (
    <StudentMenuProvider>
      <CareerContent />
    </StudentMenuProvider>
  );
}