import os
import asyncio
from app.llm.factory import get_llm_client

async def test():
    client = get_llm_client('groq')
    res = await client.generate('You are a helpful assistant.', 'Say hi!', max_tokens=10)
    print(res)

asyncio.run(test())
