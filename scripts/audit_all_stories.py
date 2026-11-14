#!/usr/bin/env python3
"""
Full QA Audit Suite for Lesecoach Studio Audio.
Independently verifies every sliced audio segment across Levels 1 to 4 for:
1. Complete pronunciation of target phrase / words (no truncation of trailing vowels/syllables)
2. 0% bleed of adjacent words
"""

import os, sys, json, urllib.request, base64

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_env():
    env_path = os.path.join(REPO_ROOT, '.env')
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                if k not in os.environ:
                    os.environ[k] = v.strip('"\'')

load_env()
API_KEY = os.environ.get('GEMINI_API_KEY')
if not API_KEY:
    print('ERROR: GEMINI_API_KEY not found in .env')
    sys.exit(1)

def audit_clip(mp3_path, expected_text, adjacent_word, check_type='prefix'):
    if not os.path.exists(mp3_path):
        return {'status': 'MISSING', 'passed': False, 'notes': 'File does not exist'}
        
    with open(mp3_path, 'rb') as f:
        data = base64.b64encode(f.read()).decode('utf-8')
        
    if check_type == 'prefix':
        prompt = f'''QA Audit of German speech prefix audio.
Expected phrase spoken: "{expected_text}"
Next word in story (MUST NOT BE HEARD AT ALL): "{adjacent_word}"
Return JSON ONLY:
{{
  "complete": <true if the last word "{expected_text.split()[-1]}" is 100% complete and fully audible with all syllables, else false>,
  "bleed": <true if ANY initial sound/phoneme of "{adjacent_word}" is audible at the end, else false>,
  "notes": "<brief reason>"
}}'''
    elif check_type == 'child':
        prompt = f'''QA Audit of German child target word audio.
Expected word/phrase: "{expected_text}"
Adjacent word to avoid: "{adjacent_word}"
Return JSON ONLY:
{{
  "complete": <true if "{expected_text}" is 100% complete with full natural onset and decay, else false>,
  "bleed": <true if ANY sound/phoneme of "{adjacent_word}" is audible, else false>,
  "notes": "<brief reason>"
}}'''
    elif check_type == 'suffix':
        prompt = f'''QA Audit of German suffix audio.
Expected phrase: "{expected_text}"
Previous word in story (MUST NOT BE HEARD AT ALL): "{adjacent_word}"
Return JSON ONLY:
{{
  "complete": <true if "{expected_text.split()[0]}" is 100% complete with full natural onset, else false>,
  "bleed": <true if ANY sound/phoneme of "{adjacent_word}" is audible at start, else false>,
  "notes": "<brief reason>"
}}'''

    url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={API_KEY}'
    body = json.dumps({
        'contents': [{'parts': [{'text': prompt}, {'inlineData': {'mimeType': 'audio/mp3', 'data': data}}]}],
        'generationConfig': {'responseMimeType': 'application/json'}
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(url, headers={'Content-Type': 'application/json'}, data=body)
        resp = urllib.request.urlopen(req)
        res = json.loads(resp.read().decode('utf-8'))
        parsed = json.loads(res['candidates'][0]['content']['parts'][0]['text'])
        passed = parsed.get('complete', False) and not parsed.get('bleed', True)
        return {
            'status': 'OK',
            'passed': passed,
            'complete': parsed.get('complete', False),
            'bleed': parsed.get('bleed', False),
            'notes': parsed.get('notes', '')
        }
    except Exception as e:
        return {'status': 'ERROR', 'passed': False, 'notes': str(e)}

def run_audit(target_levels=None):
    levels = target_levels or [1, 2, 3]
    voices = ['katja', 'conrad']
    
    total = 0
    passed = 0
    failures = []
    
    print('===============================================================')
    print('  FULL QA AUDIT: STUDIO AUDIO SLICE VERIFICATION')
    print('===============================================================')
    
    for lvl in levels:
        story_file = os.path.join(REPO_ROOT, f'src/lib/data/stories/level-{lvl}/theme_forest_ep01.json')
        with open(story_file, 'r', encoding='utf-8') as f:
            story = json.load(f)
            
        print(f'\n--- LEVEL {lvl} ---')
        for v in voices:
            v_dir = os.path.join(REPO_ROOT, f'public/audio/stories/level-{lvl}/theme_forest_ep01/voices/{v}')
            for s_idx, s in enumerate(story['sentences']):
                roles = [w.get('role', 'child') for w in s['words']]
                if 'app' not in roles:
                    continue
                    
                first_ch = roles.index('child')
                last_app = first_ch - 1
                
                has_suf = False
                first_suf = -1
                for idx in range(first_ch + 1, len(roles)):
                    if roles[idx] == 'app':
                        has_suf = True
                        first_suf = idx
                        break
                        
                word_a = s['words'][last_app]['clean']
                word_b = s['words'][first_ch]['clean']
                app_phrase = ' '.join([w['clean'] for w in s['words'][:last_app + 1]])
                child_phrase = ' '.join([w['clean'] for w in s['words'][first_ch: (first_suf if has_suf else len(roles))]])
                
                # 1. Audit App Clip
                app_path = os.path.join(v_dir, f'sentence_{s_idx}_app.mp3')
                res_app = audit_clip(app_path, app_phrase, word_b, check_type='prefix')
                total += 1
                if res_app['passed']:
                    passed += 1
                    print(f'  [PASS] L{lvl} S{s_idx} ({v}) APP: "{app_phrase}"')
                else:
                    failures.append((f'L{lvl} S{s_idx} ({v}) APP', res_app))
                    print(f'  [FAIL] L{lvl} S{s_idx} ({v}) APP: {res_app["notes"]}')
                    
                # 2. Audit Child Clip
                child_path = os.path.join(v_dir, f'sentence_{s_idx}_child.mp3')
                res_child = audit_clip(child_path, child_phrase, word_a, check_type='child')
                total += 1
                if res_child['passed']:
                    passed += 1
                    print(f'  [PASS] L{lvl} S{s_idx} ({v}) CHILD: "{child_phrase}"')
                else:
                    failures.append((f'L{lvl} S{s_idx} ({v}) CHILD', res_child))
                    print(f'  [FAIL] L{lvl} S{s_idx} ({v}) CHILD: {res_child["notes"]}')
                    
                # 3. Audit Suffix Clip (if present)
                if has_suf:
                    last_ch = first_suf - 1
                    word_c = s['words'][last_ch]['clean']
                    suf_phrase = ' '.join([w['clean'] for w in s['words'][first_suf:]])
                    suf_path = os.path.join(v_dir, f'sentence_{s_idx}_suffix.mp3')
                    res_suf = audit_clip(suf_path, suf_phrase, word_c, check_type='suffix')
                    total += 1
                    if res_suf['passed']:
                        passed += 1
                        print(f'  [PASS] L{lvl} S{s_idx} ({v}) SUFFIX: "{suf_phrase}"')
                    else:
                        failures.append((f'L{lvl} S{s_idx} ({v}) SUFFIX', res_suf))
                        print(f'  [FAIL] L{lvl} S{s_idx} ({v}) SUFFIX: {res_suf["notes"]}')
                        
    rate = (passed / total * 100) if total > 0 else 0
    print('\n===============================================================')
    print(f'  AUDIT SCORECARD: {passed}/{total} CLIPS PASSED ({rate:.1f}%)')
    print('===============================================================')
    
    if failures:
        print('\nFailed Clips Summary:')
        for name, err in failures:
            print(f'  - {name}: {err.get("notes")}')
            
    return passed == total

if __name__ == '__main__':
    target = [int(a) for a in sys.argv[1:] if a.isdigit()] or None
    success = run_audit(target)
    sys.exit(0 if success else 1)

