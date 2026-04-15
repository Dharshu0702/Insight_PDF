from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pdfplumber
import requests
import json
from datetime import datetime
import os
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Session storage for PDFs (keyed by session ID)
pdf_storage = {}

def get_session_id():
    """Get session ID from request headers"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        session_id = 'default_session'
    return session_id

# osmAPI Configuration
API_KEY = os.getenv('ANTHROPIC_API_KEY', 'osm_BOeIvWrJZrPJEJfMUwsPb0NAaJHEaV4oGieRqcdO')
API_URL = "https://api.osmapi.com/v1/chat/completions"
MODEL = "qwen3.5-397b-a17b"

def call_qwen_api(system_prompt, user_message):
    """Call osmAPI (OpenAI-compatible)"""
    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.3,  # Reduced from 0.7 for more deterministic JSON
            "max_tokens": 4096
        }
        
        print(f"\n📤 Calling osmAPI with model: {MODEL}")
        print(f"📤 System prompt length: {len(system_prompt)}")
        print(f"📤 User message length: {len(user_message)}")
        
        response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ API Response received")
        print(f"   finish_reason: {result['choices'][0].get('finish_reason')}")
        print(f"   message keys: {list(result['choices'][0]['message'].keys())}")
        
        message = result['choices'][0]['message']
        content = message.get('content')
        
        # Log what we got
        if content:
            print(f"📥 Content (first 300 chars): {content[:300]}")
        
        # If content is None, try to use reasoning or other fields
        if content is None:
            reasoning = message.get('reasoning')
            if reasoning:
                print(f"⚠️  Using reasoning field (content was None)")
                content = reasoning[:2000]
            else:
                return "Error: API returned empty response with no reasoning"
        
        if not content or content.strip() == "":
            return "Error: API returned empty content"
        
        return content
    
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        print(f"❌ API Error: {error_msg}")
        import traceback
        traceback.print_exc()
        return error_msg

# ==================== API ENDPOINTS ====================

@app.route('/', methods=['GET'])
def home():
    """Root route - API info"""
    return jsonify({
        "message": "InsightPDF Backend API",
        "version": "1.0.0",
        "endpoints": [
            "POST /upload - Upload PDF",
            "POST /ask - Ask questions about PDF",
            "POST /summarize - Generate summary",
            "POST /quiz - Generate quiz",
            "GET /conversation - Get conversation history",
            "POST /clear - Clear data",
            "GET /health - Health check"
        ]
    }), 200

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Upload PDF and extract text"""
    session_id = get_session_id()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files allowed"}), 400
    
    try:
        pdf_text = ""
        page_count = 0
        
        with pdfplumber.open(file) as pdf:
            page_count = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                try:
                    text = page.extract_text()
                    if text:
                        pdf_text += text + "\n"
                    else:
                        # Try to extract tables if no text
                        tables = page.extract_tables()
                        if tables:
                            for table in tables:
                                for row in table:
                                    pdf_text += " | ".join(str(cell) if cell else "" for cell in row) + "\n"
                except Exception as e:
                    print(f"Warning: Could not extract text from page {i+1}: {e}")
        
        if not pdf_text.strip():
            return jsonify({
                "success": False,
                "error": "Could not extract text from PDF. The PDF might be image-based or encrypted."
            }), 400
        
        # Store in session storage
        pdf_storage[session_id] = {
            "content": pdf_text,
            "filename": file.filename,
            "pages": page_count,
            "history": []
        }
        
        preview = pdf_text[:300] + "..." if len(pdf_text) > 300 else pdf_text
        
        print(f" PDF uploaded: {file.filename} ({page_count} pages)")
        print(f"   Content length: {len(pdf_text)} chars")
        print(f"   Session ID: {session_id}")
        
        return jsonify({
            "success": True,
            "message": f"PDF uploaded: {file.filename}",
            "pages": page_count,
            "preview": preview
        }), 200
    
    except Exception as e:
        print(f" Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to process PDF: {str(e)}"}), 500


@app.route('/ask', methods=['POST'])
def ask_question():
    """Answer questions based on PDF (RAG)"""
    session_id = get_session_id()
    
    # Check if PDF is loaded
    if session_id not in pdf_storage or not pdf_storage[session_id]['content']:
        print(f"DEBUG: session_id={session_id}, storage keys={list(pdf_storage.keys())}")
        return jsonify({"error": "No PDF uploaded"}), 400
    
    pdf_content = pdf_storage[session_id]['content']
    
    data = request.json
    question = data.get('question', '').strip()
    difficulty = data.get('difficulty', 'intermediate')
    
    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400
    
    difficulty_guide = {
        'beginner': 'Explain simply using everyday language.',
        'intermediate': 'Provide clear explanation with some technical detail.',
        'advanced': 'Provide detailed technical explanation.'
    }
    
    system_prompt = f"""You are a helpful tutor. Answer based only on the provided notes.
Difficulty: {difficulty}
{difficulty_guide.get(difficulty, 'Explain clearly')}

If the answer is not in the notes, say so."""
    
    user_message = f"Notes:\n{pdf_content}\n\nQuestion: {question}"
    
    answer = call_qwen_api(system_prompt, user_message)
    
    # Save to history
    pdf_storage[session_id]['history'].append({
        "type": "user",
        "content": question,
        "timestamp": datetime.now().isoformat()
    })
    pdf_storage[session_id]['history'].append({
        "type": "assistant",
        "content": answer,
        "timestamp": datetime.now().isoformat()
    })
    
    return jsonify({"success": True, "answer": answer}), 200


@app.route('/summarize', methods=['POST'])
def summarize_notes():
    """Generate summary of notes"""
    session_id = get_session_id()
    
    if session_id not in pdf_storage or not pdf_storage[session_id]['content']:
        return jsonify({"error": "No PDF uploaded"}), 400
    
    pdf_content = pdf_storage[session_id]['content']
    
    try:
        system_prompt = """Create a clear summary with:
- 6-8 bullet points of main ideas
- 2-3 sentence overview"""
        
        user_message = f"Summarize:\n\n{pdf_content}"
        
        summary = call_qwen_api(system_prompt, user_message)
        
        if not summary:
            print(f" Summarize returned empty response")
            return jsonify({"error": "API returned empty response"}), 500
        
        if summary.startswith("Error:"):
            print(f" Summarize API error: {summary}")
            return jsonify({"error": summary}), 500
        
        pdf_storage[session_id]['history'].append({
            "type": "assistant",
            "content": f" Summary\n{summary}",
            "timestamp": datetime.now().isoformat(),
            "isSystemGenerated": True
        })
        
        print(f" Summary generated: {len(summary)} chars")
        return jsonify({"success": True, "summary": summary}), 200
    
    except Exception as e:
        print(f" Summarize error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate summary: {str(e)}"}), 500


@app.route('/quiz', methods=['POST'])
def generate_quiz():
    """Generate MCQ quiz"""
    session_id = get_session_id()
    
    if session_id not in pdf_storage or not pdf_storage[session_id]['content']:
        return jsonify({"error": "No PDF uploaded"}), 400
    
    pdf_content = pdf_storage[session_id]['content']
    
    data = request.json or {}
    difficulty = data.get('difficulty', 'intermediate')
    num_questions = min(max(int(data.get('num_questions', 5)), 1), 20)  # Clamp between 1-20
    
    try:
        # Ultra-simple system prompt focused only on JSON
        system_prompt = f"""You MUST respond with ONLY a JSON object. No text before or after.

{{
  "questions": [
    {{"id": 1, "question": "Q?", "options": ["A) a", "B) b", "C) c", "D) d"], "correct_option": "A) a", "explanation": "E"}}
  ]
}}

Rules:
- Replace the example with {num_questions} real questions
- ONLY output the JSON object
- NO explanation, NO markdown, NO other text"""
        
        user_message = f"""Create {num_questions} JSON quiz questions from:
{pdf_content[:3000]}"""
        
        response = call_qwen_api(system_prompt, user_message)
        
        if not response:
            return jsonify({"error": "API returned empty response"}), 500
        
        if response.startswith("Error:"):
            return jsonify({"error": response}), 500
        
        print(f"\n🐛 DEBUG: Raw API response (first 1000 chars):\n{response[:1000]}")
        print(f"🐛 DEBUG: Response length: {len(response)}")
        
        # Clean response: remove common prefixes/suffixes
        cleaned = response.strip()
        
        # Remove markdown code blocks if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
        
        # Remove common text patterns before JSON
        cleaned = re.sub(r'^.*?(?={)', '', cleaned, flags=re.DOTALL)
        
        # Try to parse JSON
        quiz_data = None
        
        # Method 1: Direct JSON parse on cleaned response
        try:
            quiz_data = json.loads(cleaned)
            print("✅ Method 1: Direct parse on cleaned response succeeded")
        except json.JSONDecodeError as e:
            print(f"❌ Method 1 failed: {e}")
            
            # Method 2: Find outermost braces
            print("🔄 Trying Method 2: Extract outermost JSON object...")
            first_brace = cleaned.find('{')
            last_brace = cleaned.rfind('}')
            
            if first_brace != -1 and last_brace != -1 and first_brace < last_brace:
                try:
                    potential_json = cleaned[first_brace:last_brace+1]
                    quiz_data = json.loads(potential_json)
                    print("✅ Method 2: Outermost braces extraction succeeded")
                except json.JSONDecodeError as e2:
                    print(f"❌ Method 2 failed: {e2}")
                    print(f"Response segment: {potential_json[:500]}")
            
            # Method 3: Try to extract valid JSON by counting braces
            if not quiz_data:
                print("🔄 Trying Method 3: Brace counting...")
                try:
                    brace_count = 0
                    start_idx = -1
                    for i, char in enumerate(cleaned):
                        if char == '{':
                            if brace_count == 0:
                                start_idx = i
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0 and start_idx != -1:
                                potential_json = cleaned[start_idx:i+1]
                                quiz_data = json.loads(potential_json)
                                print("✅ Method 3: Brace counting succeeded")
                                break
                except Exception as e3:
                    print(f"❌ Method 3 failed: {e3}")
            
            # If still nothing, show detailed error
            if not quiz_data:
                print(f"❌ All JSON extraction methods failed")
                print(f"Full response:\n{response}")
                print(f"Cleaned response:\n{cleaned}")
                
                # Try to extract what we can for debugging
                first_100 = response[:100]
                last_100 = response[-100:]
                
                return jsonify({
                    "error": "Could not parse quiz response as JSON",
                    "debug": {
                        "response_length": len(response),
                        "starts_with": first_100,
                        "ends_with": last_100,
                        "full_response": response  # For backend logs only
                    }
                }), 500
        
        print(f"\n✅ Successfully parsed JSON with {len(quiz_data.get('questions', []))} questions")
        
        
        # Validate we got the right number of questions
        questions = quiz_data.get('questions', [])
        print(f" Quiz response had {len(questions)} questions (requested {num_questions})")
        
        # Log first question structure for debugging
        if questions:
            print(f"🐛 DEBUG: First question structure: {json.dumps(questions[0], indent=2)}")
        
        # Check for template placeholder data (more lenient check)
        has_placeholder = False
        for q in questions:
            question_text = str(q.get('question', ''))
            options_text = str(q.get('options', []))
            
            if (("Question text?" in question_text and len(question_text) < 20) or
                ("Option1" in options_text and "Option2" in options_text and "Option3" in options_text and "Option4" in options_text) or
                ("Replace with" in question_text and "example" in question_text.lower())):
                has_placeholder = True
                break
        
        if has_placeholder:
            print(f" WARNING: Response contains template placeholder text")
            return jsonify({"error": "API returned template data. Please try again with different questions count."}), 500
        
        # Validate that each question has proper structure
        for i, q in enumerate(questions):
            if not q.get('correct_option'):
                print(f" WARNING: Question {i+1} missing correct_option")
                q['correct_option'] = q.get('options', ['A) Option1'])[0]  # Fallback
            
            # Ensure correct_option is one of the options
            if q['correct_option'] not in q.get('options', []):
                print(f" WARNING: Question {i+1} correct_option not in options")
                print(f"  correct_option: {q['correct_option']}")
                print(f"  options: {q.get('options', [])}")
        
        # If we got fewer questions than requested, try to note it
        if len(questions) < num_questions:
            print(f" WARNING: Requested {num_questions} but got {len(questions)} questions")
        
        pdf_storage[session_id]['history'].append({
            "type": "assistant",
            "content": f" Quiz ({difficulty}) - {len(questions)} questions generated",
            "timestamp": datetime.now().isoformat(),
            "isSystemGenerated": True
        })
        
        print(f"✅ Quiz generated: {len(questions)} questions (requested {num_questions})")
        print(f"🐛 DEBUG: Sending quiz data structure:")
        for i, q in enumerate(questions[:2]):  # Show first 2 questions
            print(f"  Q{i+1}: correct_option = {q.get('correct_option')} (type: {type(q.get('correct_option'))})")
        
        return jsonify({"success": True, "quiz": quiz_data}), 200
    
    except Exception as e:
        print(f" Quiz generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500


@app.route('/conversation', methods=['GET'])
def get_conversation():
    """Get conversation history"""
    session_id = get_session_id()
    
    if session_id not in pdf_storage:
        return jsonify({"success": True, "conversation": []}), 200
    
    return jsonify({"success": True, "conversation": pdf_storage[session_id]['history']}), 200


@app.route('/clear', methods=['POST'])
def clear_data():
    """Clear all data"""
    session_id = get_session_id()
    
    if session_id in pdf_storage:
        del pdf_storage[session_id]
    
    return jsonify({"success": True, "message": "Data cleared"}), 200


@app.route('/health', methods=['GET'])
def health_check():
    """Health check"""
    session_id = get_session_id()
    has_pdf = session_id in pdf_storage and len(pdf_storage[session_id]['content']) > 0
    
    return jsonify({
        "status": "running",
        "pdf_loaded": has_pdf,
        "session_id": session_id
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f" Backend running on port {port}")
    app.run(debug=False, host='0.0.0.0', port=port)