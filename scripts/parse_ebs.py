#!/usr/bin/env python3
"""EBS 수능특강 문학 HWP추출 텍스트 -> 구조화 JSON 파서."""
import re, json, sys

def parse(text):
    # 교재명(부/강/갈래) 헤더 위치 수집
    unit_re = re.compile(
        r'교재명\s*\n.*?\n?Page\s*(\d+)\s*\n?(\d+부)\s+([^\n]+?)\s+(\d+강)\s+([^\n#]+)',
        re.S)
    units=[]
    for m in re.finditer(r'교재명', text):
        chunk=text[m.start():m.start()+200].replace('\n',' ')
        mm=re.search(r'Page\s+(\d+)\s+(\d+부)\s+(.+?)\s+(\d+강)\s+(.+?)\s+#강', chunk)
        if mm:
            units.append((m.start(), mm.group(2), mm.group(3).strip(),
                          mm.group(4), mm.group(5).strip()))
    def unit_at(pos):
        cur=units[0][1:] if units else ('','','','')
        for u in units:
            if u[0]<=pos: cur=u[1:]
            else: break
        return cur

    # 블록 마커: #강 N #쪽 N #번 X #문항코드 [code]
    marker=re.compile(
        r'#강\s*\n?\s*(\d+)\s*\n?#쪽\s*\n?\s*(\d+)\s*\n?#번\s*\n?\s*([\d~∼]+)\s*\n?#문항코드\s*\n?\s*(26001-\d+)?')
    marks=list(marker.finditer(text))
    blocks=[]
    for i,m in enumerate(marks):
        start=m.end()
        end=marks[i+1].start() if i+1<len(marks) else len(text)
        body=text[start:end].strip()
        gang,jjok,beon,code=m.group(1),m.group(2),m.group(3),m.group(4)
        bu,buname,gangno,galae=unit_at(m.start())
        blocks.append(dict(pos=m.start(),gang=gang,jjok=int(jjok),beon=beon,
                           code=code,bu=bu,buname=buname,galae=galae,body=body))
    # 지문/문제 분류 + 지문 연결
    items=[]; cur_passage=None
    for b in blocks:
        body=b['body']
        if '[지문]' in body and not b['code']:
            # 지문 블록
            seg=body.split('[지문]',1)[1]
            if '[해설]' in seg:
                passage, haesol = seg.split('[해설]',1)
            else:
                passage, haesol = seg, ''
            # remove leading "다음 글을 읽고..." 지시문은 유지
            cur_passage=dict(beon=b['beon'],jjok=b['jjok'],bu=b['bu'],
                             buname=b['buname'],galae=b['galae'],
                             text=passage.strip(), analysis=haesol.strip())
        elif '[문제]' in body and b['code']:
            seg=body.split('[문제]',1)[1]
            answer=''; explain=''; qtext=seg
            if '[정답/모범답안]' in seg:
                qtext, rest = seg.split('[정답/모범답안]',1)
                if '[해설]' in rest:
                    answer, explain = rest.split('[해설]',1)
                else:
                    answer=rest
            elif '[해설]' in seg:
                qtext, explain = seg.split('[해설]',1)
            items.append(dict(code=b['code'],gang=b['gang'],jjok=b['jjok'],
                beon=b['beon'],bu=b['bu'],buname=b['buname'],galae=b['galae'],
                question=qtext.strip(),answer=answer.strip(),
                explanation=explain.strip(),
                passage=cur_passage))
    return units,blocks,items

if __name__=='__main__':
    text=open(sys.argv[1],encoding='utf-8').read()
    units,blocks,items=parse(text)
    print("교재명 단원:",len(units),"| 블록:",len(blocks),"| 문항:",len(items))
    passages={id(it['passage']) for it in items if it['passage']}
    print("연결된 지문 수:",len(passages))
    no_p=[it['code'] for it in items if not it['passage']]
    print("지문없는 문항:",len(no_p))
    json.dump(items,open(sys.argv[2],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print("저장:",sys.argv[2])
